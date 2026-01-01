import { createContext, ReactNode, useContext } from "react";
import {
    useQuery,
    useMutation,
    UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/api";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
    loginMutation: UseMutationResult<User, Error, LoginData>;
    logoutMutation: UseMutationResult<void, Error, void>;
    registerMutation: UseMutationResult<User, Error, InsertUser>;
    updateProfileMutation: UseMutationResult<User, Error, Partial<Pick<User, 'display_name' | 'email'>>>;
};

type LoginData = Pick<User, "username" | "password">;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();

    const {
        data: user,
        error,
        isLoading,
        refetch,
    } = useQuery<User | null>({
        queryKey: ["/api/user"],
        queryFn: async () => {
            const res = await fetch("/api/user");
            if (!res.ok) {
                if (res.status === 401) {
                    return null;
                }
                throw new Error("Failed to fetch user");
            }
            return res.json();
        },
        // Do not retry on 401
        retry: false,
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginData) => {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
            });
            if (!res.ok) {
                throw new Error((await res.text()) || "Login failed");
            }
            return res.json();
        },
        onSuccess: (user: User) => {
            // Manually update the query cache
            refetch();
            toast({
                title: "Logged in",
                description: `Welcome back, ${user.username}`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Login failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/logout", {
                method: "POST",
            });
            if (!res.ok) {
                throw new Error("Logout failed");
            }
        },
        onSuccess: () => {
            // Manually update the query cache to null
            refetch();
            toast({
                title: "Logged out",
                description: "See you next time",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Logout failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (newUser: InsertUser) => {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser),
            });
            if (!res.ok) {
                throw new Error((await res.text()) || "Registration failed");
            }
            return res.json();
        },
        onSuccess: (user: User) => {
            // Manually update the query cache (user is auto-logged in on register)
            refetch();
            toast({
                title: "Account created",
                description: `Welcome, ${user.username}`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Registration failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (updates: Partial<Pick<User, 'display_name' | 'email'>>) => {
            const res = await fetch("/api/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                throw new Error((await res.text()) || "Profile update failed");
            }
            return res.json();
        },
        onSuccess: (user: User) => {
            // Manually update the query cache
            refetch();
            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Update failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <AuthContext.Provider
            value={{
                user: user ?? null,
                isLoading,
                error: error as Error | null,
                loginMutation,
                logoutMutation,
                registerMutation,
                updateProfileMutation,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
