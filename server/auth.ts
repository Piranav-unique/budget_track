import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Express } from 'express';
import session from 'express-session';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { storage } from './storage';
import { User } from '../shared/api';
import { pool } from './db';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split('.');
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function findOrCreateOAuthUser(
    provider: 'google' | 'github',
    providerId: string,
    displayName: string,
    email?: string
) {
    const username = `${provider}_${providerId}`;
    let user = await storage.getUserByUsername(username);
    if (user) {
        // Update display name and email if they're missing or changed
        if ((!user.display_name && displayName) || (!user.email && email)) {
            await pool.query(
                'UPDATE users SET display_name = COALESCE($1, display_name), email = COALESCE($2, email) WHERE id = $3',
                [displayName || null, email || null, user.id]
            );
            // Fetch updated user
            user = await storage.getUser(user.id);
        }
        return user;
    }

    // Generate a random password so the row is compatible with the existing schema.
    const randomPassword = randomBytes(32).toString('hex');
    const hashedPassword = await hashPassword(randomPassword);

    user = await storage.createUser({
        username,
        password: hashedPassword,
        display_name: displayName,
        email: email,
        provider: provider
    });

    return user;
}

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET || 'secret',
        resave: false,
        saveUninitialized: false,
        store: undefined, // MemoryStore by default
        cookie: {
            secure: app.get('env') === 'production',
            maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
        }
    };

    // Use trust proxy if behind a proxy (like Replit/Nginx)
    app.set('trust proxy', 1);

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const user = await storage.getUserByUsername(username);
                if (!user || !(await comparePasswords(password, user.password))) {
                    return done(null, false);
                } else {
                    return done(null, user);
                }
            } catch (err) {
                return done(err);
            }
        })
    );

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

    if (googleClientId && googleClientSecret) {
        passport.use(
            new GoogleStrategy(
                {
                    clientID: googleClientId,
                    clientSecret: googleClientSecret,
                    callbackURL: googleCallbackURL
                },
                async (_accessToken, _refreshToken, profile, done) => {
                    try {
                        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : undefined;
                        const displayName = profile.displayName || profile.name?.givenName || profile.name?.familyName || email?.split('@')[0] || 'Google User';
                        const user = await findOrCreateOAuthUser('google', profile.id, displayName, email);
                        return done(null, user);
                    } catch (err) {
                        return done(err);
                    }
                }
            )
        );
    } else {
        console.warn('Google OAuth environment variables are not set. Google login is disabled.');
    }

    const githubClientId = process.env.GH_CLIENT_ID;
    const githubClientSecret = process.env.GH_CLIENT_SECRET;
    const githubCallbackURL = process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback';

    if (githubClientId && githubClientSecret) {
        passport.use(
            new GitHubStrategy(
                {
                    clientID: githubClientId,
                    clientSecret: githubClientSecret,
                    callbackURL: githubCallbackURL,
                    scope: ['user:email']
                },
                async (_accessToken, _refreshToken, profile, done) => {
                    try {
                        // GitHub profile structure: profile._json contains the user data
                        const githubProfile = profile._json as any;
                        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : githubProfile?.email || undefined;
                        const displayName = githubProfile?.name || profile.displayName || profile.username || githubProfile?.login || email?.split('@')[0] || 'GitHub User';
                        const user = await findOrCreateOAuthUser('github', profile.id.toString(), displayName, email);
                        return done(null, user);
                    } catch (err) {
                        return done(err);
                    }
                }
            )
        );
    } else {
        console.warn('GitHub OAuth environment variables are not set. GitHub login is disabled.');
    }

    passport.serializeUser((user, done) => {
        done(null, (user as User).id);
    });

    passport.deserializeUser(async (id: number, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.post('/api/register', async (req, res, next) => {
        try {
            const existingUser = await storage.getUserByUsername(req.body.username);
            if (existingUser) {
                return res.status(400).send("Username already exists");
            }

            const hashedPassword = await hashPassword(req.body.password);
            const user = await storage.createUser({
                ...req.body,
                password: hashedPassword
            });

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (err) {
            next(err);
        }
    });

    app.post('/api/login', (req, res, next) => {
        passport.authenticate('local', (err: any, user: any, info: any) => {
            if (err) return next(err);
            if (!user) return res.status(401).send("Invalid credentials");
            req.login(user, (err) => {
                if (err) return next(err);
                res.json(user);
            });
        })(req, res, next);
    });

    app.post('/api/logout', (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get('/api/user', (req, res) => {
        if (req.isAuthenticated()) {
            return res.json(req.user);
        }
        res.status(401).send("Not authenticated");
    });

    app.put('/api/user', async (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).send("Not authenticated");
        }

        try {
            const user = req.user as User;
            const { display_name, email } = req.body;

            // Validate email format if provided
            if (email && !email.includes('@')) {
                return res.status(400).send("Invalid email format");
            }

            const updatedUser = await storage.updateUser(user.id, {
                display_name: display_name !== undefined ? display_name : undefined,
                email: email !== undefined ? email : undefined,
            });

            if (!updatedUser) {
                return res.status(404).send("User not found");
            }

            // Update the session with the new user data
            req.login(updatedUser, (err) => {
                if (err) return next(err);
                res.json(updatedUser);
            });
        } catch (err) {
            next(err);
        }
    });

    // OAuth routes
    if (googleClientId && googleClientSecret) {
        app.get(
            '/api/auth/google',
            passport.authenticate('google', {
                scope: ['profile', 'email']
            })
        );

        app.get(
            '/api/auth/google/callback',
            passport.authenticate('google', {
                failureRedirect: '/login?error=google_auth_failed'
            }),
            (req, res) => {
                // Successful authentication - redirect to dashboard
                // The session is already established by passport
                res.redirect('/dashboard');
            }
        );
    }

    if (githubClientId && githubClientSecret) {
        app.get(
            '/api/auth/github',
            passport.authenticate('github', {
                scope: ['user:email']
            })
        );

        app.get(
            '/api/auth/github/callback',
            passport.authenticate('github', {
                failureRedirect: '/login?error=github_auth_failed'
            }),
            (req, res) => {
                // Successful authentication - redirect to dashboard
                // The session is already established by passport
                res.redirect('/dashboard');
            }
        );
    }
}
