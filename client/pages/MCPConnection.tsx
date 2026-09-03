import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Copy, Check, Mail, Key, Loader2 } from "lucide-react";

export default function MCPConnection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"request" | "verify" | "success">("request");
  const [otpCode, setOtpCode] = useState("");
  const [mcpToken, setMcpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const handleRequestOTP = async () => {
    if (!user?.email) {
      toast({
        title: "Email Required",
        description: "Please add an email address to your profile first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mcp/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send OTP");
      }

      const data = await res.json();
      setEmail(data.email || user.email);
      
      // If in development mode, show OTP code
      if (data.developmentMode && data.otpCode) {
        setDevOtp(data.otpCode);
        toast({
          title: "OTP Generated (Development Mode)",
          description: `SMTP not configured. OTP: ${data.otpCode}`,
          duration: 10000,
        });
      } else {
        setDevOtp(null);
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${data.email || user.email}`,
        });
      }
      
      setStep("verify");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mcp/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Invalid OTP code");
      }

      const data = await res.json();
      setMcpToken(data.token);
      setStep("success");
      toast({
        title: "Verified!",
        description: `MCP token generated for ${user.email || user.username}`,
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid OTP code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (!mcpToken) return;
    navigator.clipboard.writeText(mcpToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "MCP token copied to clipboard",
    });
  };

  const copyConnectionURL = () => {
    const url = `https://budget-track-mcp-server.onrender.com/sse?token=${mcpToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Connection URL copied to clipboard",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to connect ChatGPT MCP</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user.email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email Required</CardTitle>
            <CardDescription>
              You need to add an email address to your profile to use ChatGPT MCP connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/profile"}>
              Go to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              ChatGPT MCP Connection
            </CardTitle>
            <CardDescription>
              Connect your Budget Tracker to ChatGPT using Model Context Protocol
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "request" && (
              <div className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    We'll send a verification code to <strong>{user.email}</strong> to verify your identity.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleRequestOTP} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === "verify" && (
              <div className="space-y-4">
                {devOtp ? (
                  <Alert className="border-yellow-500 bg-yellow-50">
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Development Mode:</strong> SMTP is not configured. Your OTP code is:
                      <div className="mt-2 p-3 bg-white rounded border-2 border-yellow-500">
                        <code className="text-2xl font-bold tracking-widest text-yellow-700">
                          {devOtp}
                        </code>
                      </div>
                      <p className="mt-2 text-sm">
                        Configure SMTP to receive emails. See <code>EMAIL_SETUP.md</code> for instructions.
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Enter the 6-digit code sent to <strong>{email || user.email}</strong>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("request");
                      setOtpCode("");
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={loading || otpCode.length !== 6}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="space-y-4">
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Your MCP connection has been verified! Use the token below to connect ChatGPT.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    This token is linked to: <strong>{user.email || user.username}</strong>
                    <br />
                    All expenses added via ChatGPT will be associated with this account.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>MCP Server URL (with token)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`https://budget-track-mcp-server.onrender.com/sse?token=${mcpToken}`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyConnectionURL}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Copy this URL and use it in ChatGPT's MCP Server URL field
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Or use token separately</Label>
                  <div className="flex gap-2">
                    <Input
                      value={mcpToken}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToken}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    If ChatGPT supports token authentication, use this token
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">How to Connect:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Open ChatGPT and go to MCP server settings</li>
                    <li>Click "New App" or "Add MCP Server"</li>
                    <li>Paste the MCP Server URL above</li>
                    <li>Set Authentication to "No Auth"</li>
                    <li>Click "Create"</li>
                  </ol>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("request");
                    setOtpCode("");
                    setMcpToken("");
                  }}
                  className="w-full"
                >
                  Generate New Token
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

