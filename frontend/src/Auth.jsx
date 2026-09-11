import { useState } from "react";
import { supabase } from "./supabaseClient";

function Auth({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          onLogin(data.session.user);
        } else {
          setMessage(
            "Account created. Check your email if confirmation is required."
          );
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
          throw error;
        }

        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-700">
            EcoDrive 🚗🌱
          </h1>

          <p className="text-gray-500 mt-2">
            {isSignup
              ? "Create your EcoDrive account"
              : "Welcome back"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {isSignup && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 rounded-lg p-3">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 text-green-700 rounded-lg p-3">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
          >
            {loading
              ? "Please wait..."
              : isSignup
              ? "Create Account"
              : "Login"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsSignup(!isSignup);
            setError("");
            setMessage("");
          }}
          className="w-full mt-5 text-green-700 font-medium"
        >
          {isSignup
            ? "Already have an account? Login"
            : "Don't have an account? Create one"}
        </button>

      </div>
    </div>
  );
}

export default Auth;