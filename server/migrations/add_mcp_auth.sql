-- Create table for OTP codes
CREATE TABLE IF NOT EXISTS mcp_otp_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create table for MCP tokens
CREATE TABLE IF NOT EXISTS mcp_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mcp_otp_user_email ON mcp_otp_codes(user_id, email);
CREATE INDEX IF NOT EXISTS idx_mcp_otp_code ON mcp_otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_token ON mcp_tokens(token);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user ON mcp_tokens(user_id);

-- Clean up expired OTP codes (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_expired_otp()
RETURNS void AS $$
BEGIN
    DELETE FROM mcp_otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

