import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LoginFormData {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    fullName?: string;
    email: string;
    role?: number;
  };
}

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const API_URL = "http://localhost:5296/api/User/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result: AuthResponse = await response.json();
      if (!response.ok || !result.success || !result.user || !result.token) {
        setError(result.message || "Login failed");
        setLoading(false);
        return;
      }
      const savedStatus = JSON.parse(
        localStorage.getItem("salonStatus") || "{}"
      );

      const userStatus = savedStatus[result.user.id] || "pending";

      if (result.user.role === 2 && userStatus !== "approved") {
        setError(
          "Your account is not approved yet. Please wait for admin approval."
        );
        setLoading(false);
        return;
      }


      localStorage.setItem("authToken", result.token);
      localStorage.setItem(
        "userRole",
        result.user.role?.toString() ?? "0"
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          role: result.user.role,
          staffId: result.user.id,
        })
      );

      switch (result.user.role) {
        case 1:
          navigate("/super-admin/deshboard");
          break;
        case 2:
          navigate("/admin/dashboard");
          break;
        case 3:
          navigate("/employee/deshbord");
          break;
        case 4:
          navigate("/customer/booking");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      setError("Connection error. Please check backend server.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          Sign in
        </h1>

        <p className="text-gray-600 text-center mb-8 text-sm">
          Enter your credentials to continue
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            required
            disabled={loading}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-12"
              required
              disabled={loading}
            />

            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-2 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-gray-600 text-sm mt-6">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-blue-600 font-medium hover:text-blue-800"
            >
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
    </>
  );
}

export default Login;