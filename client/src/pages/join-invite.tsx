import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, User, Lock, Check, AlertCircle } from "lucide-react";
import { CinemaDecoration } from "@/components/cinema-decoration";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import z from "zod";

interface InviteInfo {
  code: string;
  label: string | null;
  userLabel: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  userExpiryEnabled: boolean;
  userExpiryHours: number | null;
}

const fetchInviteInfo = async (code: string): Promise<InviteInfo> => {
  const response = await fetch(`/api/invites/by-code/${code}`);
  if (!response.ok) {
    throw new Error("Invalid invite code");
  }
  return await response.json();
};

const useInvite = async (code: string, userData: { username: string; password: string }): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`/api/invites/use/${code}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || "Failed to use invite");
  }
  
  return data;
};

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Username validation schema
const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export default function JoinInvite() {
  const [, params] = useRoute<{ code: string }>("/join/:code");
  const inviteCode = params?.code || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [receiveUpdates, setReceiveUpdates] = useState(false);
  
  // Validation states
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  
  // Password strength
  const [passwordStrength, setPasswordStrength] = useState("Not set");
  
  // Fetch invite info
  const inviteQuery = useQuery({
    queryKey: ["/api/invites/by-code", inviteCode],
    queryFn: () => fetchInviteInfo(inviteCode),
    enabled: !!inviteCode,
    retry: false,
  });
  
  // Use invite mutation
  const useInviteMutation = useMutation({
    mutationFn: () => useInvite(inviteCode, { username, password }),
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "Your account has been created successfully. You can now log in.",
      });
      
      // Redirect to login page after successful registration
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Validate username on change
  useEffect(() => {
    if (username) {
      try {
        usernameSchema.parse(username);
        setUsernameError(null);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setUsernameError(error.errors[0].message);
        }
      }
    } else {
      setUsernameError(null);
    }
  }, [username]);
  
  // Validate password on change
  useEffect(() => {
    if (password) {
      try {
        passwordSchema.parse(password);
        setPasswordError(null);
        
        // Set password strength
        if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
          setPasswordStrength("Strong");
        } else if (password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
          setPasswordStrength("Medium");
        } else {
          setPasswordStrength("Weak");
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          setPasswordError(error.errors[0].message);
        }
        setPasswordStrength("Weak");
      }
    } else {
      setPasswordError(null);
      setPasswordStrength("Not set");
    }
    
    // Also validate confirm password if it's already set
    if (confirmPassword) {
      if (confirmPassword !== password) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError(null);
      }
    }
  }, [password, confirmPassword]);
  
  // Validate confirm password on change
  useEffect(() => {
    if (confirmPassword) {
      if (confirmPassword !== password) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError(null);
      }
    } else {
      setConfirmPasswordError(null);
    }
  }, [confirmPassword, password]);
  
  // Handle create account
  const handleCreateAccount = () => {
    // Validate inputs
    let hasError = false;
    
    try {
      usernameSchema.parse(username);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setUsernameError(error.errors[0].message);
        hasError = true;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setPasswordError(error.errors[0].message);
        hasError = true;
      }
    }
    
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      hasError = true;
    }
    
    if (hasError) {
      return;
    }
    
    // Submit form
    useInviteMutation.mutate();
  };
  
  // If invite code is invalid or not found
  if (inviteQuery.isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md mx-auto space-y-8 bg-card shadow-lg rounded-lg p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invalid Invite</h2>
            <p className="text-muted-foreground mb-6">
              The invite code is invalid, expired, or has reached its maximum number of uses.
            </p>
            <Button 
              className="w-full"
              onClick={() => setLocation("/login")}
            >
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left section: Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center mb-8">
              <div className="inline-block rounded-full bg-primary p-3">
                <User className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold mt-4">Create Account</h1>
              <p className="text-muted-foreground mt-2">
                Join Jellyfin with invite code: 
                <span className="text-primary font-semibold ml-1">{inviteCode}</span>
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    className={`pl-10 ${usernameError ? 'border-destructive' : ''}`}
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={useInviteMutation.isPending}
                  />
                </div>
                {usernameError && (
                  <p className="text-destructive text-sm">{usernameError}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    className={`pl-10 pr-10 ${passwordError ? 'border-destructive' : ''}`}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={useInviteMutation.isPending}
                  />
                  <div 
                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {passwordError && (
                  <p className="text-destructive text-sm">{passwordError}</p>
                )}
                <div className="mt-1">
                  <p className="text-sm text-muted-foreground">
                    Password strength: {' '}
                    <span className={`font-medium ${
                      passwordStrength === 'Strong' ? 'text-green-500' :
                      passwordStrength === 'Medium' ? 'text-amber-500' :
                      passwordStrength === 'Weak' ? 'text-red-500' :
                      'text-muted-foreground'
                    }`}>
                      {passwordStrength}
                    </span>
                  </p>
                  <div className="w-full h-2 bg-muted rounded-full mt-1 overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${
                      passwordStrength === 'Strong' ? 'bg-green-500 w-full' :
                      passwordStrength === 'Medium' ? 'bg-amber-500 w-2/3' :
                      passwordStrength === 'Weak' ? 'bg-red-500 w-1/3' :
                      'w-0'
                    }`}></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    className={`pl-10 pr-10 ${confirmPasswordError ? 'border-destructive' : ''}`}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={useInviteMutation.isPending}
                  />
                  <div 
                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {confirmPasswordError && (
                  <p className="text-destructive text-sm">{confirmPasswordError}</p>
                )}
              </div>
              
              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="receiveUpdates"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={receiveUpdates}
                  onChange={(e) => setReceiveUpdates(e.target.checked)}
                  disabled={useInviteMutation.isPending}
                />
                <label htmlFor="receiveUpdates" className="ml-2 block text-sm text-muted-foreground">
                  Receive updates and newsletters
                </label>
              </div>
              
              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={handleCreateAccount}
                  disabled={useInviteMutation.isPending || !!usernameError || !!passwordError || !!confirmPasswordError}
                >
                  {useInviteMutation.isPending ? (
                    <div className="flex items-center">
                      <span className="mr-2">Creating Account...</span>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <User className="h-5 w-5 mr-2" />
                      Create Jellyfin Account
                    </div>
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <a
                    className="text-primary hover:underline cursor-pointer"
                    onClick={() => setLocation("/login")}
                  >
                    Log in
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right section: Cinema decoration */}
        <div className="hidden md:flex flex-1 relative">
          <CinemaDecoration />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white z-10 w-4/5">
            <h2 className="text-4xl font-bold mb-4">Join Jellyfin</h2>
            <p className="text-xl mb-6">Your gateway to a personalized media experience</p>
            {inviteQuery.data?.userLabel && (
              <div className="bg-primary/20 p-4 rounded-lg backdrop-blur-sm">
                <p className="text-lg font-medium">{inviteQuery.data.userLabel}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
        © 2025 Jellyfin, The Free Software Media System
      </footer>
    </div>
  );
}