import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import { setLogin } from "../../Redux/Store/Slice/authSlice";
import { getSalonBookingAPI } from "../../api/generated";

const { postApiUserLogin } = getSalonBookingAPI();

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const validateField = (name: string, value: string) => {
    if (name === "email") {
      if (!value.trim()) return "Email is required";
      if (!value.includes("@") || !value.includes(".")) return "Email must contain '@' and '.'";
      if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(value)) return "Please enter a valid email address";
      return "";
    }
    if (name === "password") {
      if (!value) return "Password is required";
      if (value.length < 6) return "Password must be at least 6 characters";
      return "";
    }
    return "";
  };

  const isFormValid = () => {
    const emailError = validateField("email", formData.email);
    const passwordError = validateField("password", formData.password);
    return !emailError && !passwordError;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (submitted) setError("");
  };

  const getCookie = (name: string) => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) return decodeURIComponent(value);
    }
    return null;
  };

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await postApiUserLogin({
        email: data.email,
        password: data.password,
      });
      return response.data;
    },
    onSuccess: (data: any) => {
      if (!data) {
        setError("No response from server");
        return;
      }

      if (data.status === false) {
        setError(data.message || "Invalid email or password");
        return;
      }

      if (!data.result || !data.result.user) {
        setError("Invalid response from server");
        return;
      }

      const user = data.result.user;

      let token = getCookie('jwt_token') ||
        getCookie('token') ||
        getCookie('authToken') ||
        user.id;

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("jwt_token", token);
      localStorage.setItem("authToken", token);
      dispatch(setLogin({ user, token }));

      const savedStatus = JSON.parse(localStorage.getItem("salonStatus") || "{}");
      if (user.role === 2 && savedStatus[user.id] !== "approved") {
        setError("Login will only be allowed after approval by the Super Admin.");
        return;
      }

      const redirectPath = localStorage.getItem("redirectAfterLogin");
      localStorage.removeItem("redirectAfterLogin");

      const roleRoutes: Record<number, string> = {
        1: "/super-admin/deshboard",
        2: "/admin/dashboard",
        3: "/employee/deshbord",
        4: "/customer/booking",
      };

      if (redirectPath && redirectPath !== "/" && redirectPath !== "/login") {
        navigate(redirectPath);
      } else {
        navigate(roleRoutes[user.role] || "/");
      }
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Server error. Please try again.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (!isFormValid()) return;

    loginMutation.mutate({
      email: formData.email,
      password: formData.password,
    });
  };

  const emailError = submitted ? validateField("email", formData.email) : "";
  const passwordError = submitted ? validateField("password", formData.password) : "";
  const isLoading = loginMutation.isPending;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Sign in</h1>
        <p className="text-gray-600 text-center mb-8 text-sm">Enter your credentials to continue</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg ${emailError ? "border-red-500" : "border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={isLoading}
            />
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg pr-12 ${passwordError ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-gray-600 text-sm mt-6">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-600 font-medium hover:text-blue-800">
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;