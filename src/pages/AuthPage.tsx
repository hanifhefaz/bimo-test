import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Sparkles, Users, Gamepad2 } from "lucide-react";

export const AuthPage = () => {
  const { signIn, signUp, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState(""); // email or username for sign in
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await signIn(identifier, password);
      } else {
        if (!username.trim()) {
          setError("Username is required");
          setIsSubmitting(false);
          return;
        }
        await signUp(identifier, password, username, {
          fullName: username,
          age: 18,
          gender: 'other',
          country: 'Unknown'
        });
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: MessageSquare, text: "Real-time chat" },
    { icon: Users, text: "Make friends" },
    { icon: Gamepad2, text: "Play games" },
    { icon: Sparkles, text: "Collect pets" },
  ];

  return (
    <div className="min-h-screen gradient-dark flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mb-4 glow-primary"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <MessageSquare className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-gradient-primary">
            ChatVerse
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect, Chat, Play, Collect
          </p>
        </div>

        {/* Features */}
        <div className="flex justify-center gap-6 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-lg glass flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-caption text-muted-foreground">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Auth Form */}
        <Card className="glass border-border">
          <CardHeader className="text-center">
            <CardTitle>{isLogin ? "Welcome Back" : "Join ChatVerse"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Sign in to continue your adventure"
                : "Create an account and get 1,000 free credits!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Username
                  </label>
                  <Input
                    className="glass border-border"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    required={!isLogin}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email or Username
                </label>
                <Input
                  className="glass border-border"
                  type="text"
                  placeholder="your@email.com or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  className="glass border-border"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-body text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-caption text-muted-foreground mt-6">
          Powered by Firebase 🔥
        </p>
      </motion.div>
    </div>
  );
};

