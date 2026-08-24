import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { setLogin } from "../../Redux/Store/Slice/authSlice";
import { getSalonBookingAPI, type LoginRequest, type LoginResponseApiResponse, } from "../../api/generated";
import { getDashboardPath } from "../../config/Route";
const { postApiUserLogin } = getSalonBookingAPI();

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const validateField = (name: string, value: string): string => {
    if (name === "email") {
      if (!value.trim()) return "Email is required";
      if (!value.includes("@") || !value.includes(".")) {
        return "Email must contain '@' and '.'";
      }
      if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(value)) {
        return "Please enter a valid email address";
      }
      return "";
    }
    if (name === "password") {
      if (!value) return "Password is required";
      if (value.length < 6) {
        return "Password must be at least 6 characters";
      }
      return "";
    }
    return "";
  };

  const isFormValid = (): boolean => {
    const emailError = validateField(
      "email",
      formData.email ?? ""
    );
    const passwordError = validateField(
      "password",
      formData.password ?? ""
    );
    return !emailError && !passwordError;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const roleMap: Record<string, number> = {
    SuperAdmin: 1,
    Admin: 2,
    Employee: 3,
    Customer: 4,
  };

  const loginMutation = useMutation<LoginResponseApiResponse, AxiosError<{ message?: string }>, LoginRequest>({
    mutationFn: async (data: LoginRequest): Promise<LoginResponseApiResponse> => {
      const response = await postApiUserLogin(data, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (!data) {
        setError("No response from server");
        return;
      }
      if (!data.status) {
        setError(
          data.message || "Invalid email or password"
        );
        return;
      }
      const result = data.result;
      if (!result) {
        setError("Invalid response from server");
        return;
      }
      const role = result.role ?? "";
      const roleNumber = roleMap[role];
      if (!roleNumber) {
        setError("Invalid user role");
        return;
      }

      const user = {
        id: result.userId ?? "",
        fullName: result.fullName ?? "",
        email: result.email ?? "",
        role: roleNumber,
        companyId: result.companyId ?? "",
        salonName: result.companyId ?? "",
        isActive: true,
        joinedDate: new Date().toISOString(),
      };

      dispatch(
        setLogin({
          user,
        })
      );

      const redirectPath =
      localStorage.getItem("redirectAfterLogin");
      localStorage.removeItem("redirectAfterLogin");
      if (
        redirectPath &&
        redirectPath !== "/" &&
        redirectPath !== "/login"
      ) {
        navigate(redirectPath, {
          replace: true,
        });
        return;
      }
      navigate(getDashboardPath(roleNumber), {
        replace: true,
      });
    },

    onError: (err) => {
      setError(
        err.response?.data?.message ||
        "Server error. Please try again."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (!isFormValid()) {
      return;
    }
    loginMutation.mutate(formData);
  };
  const emailError = submitted
    ? validateField(
      "email",
      formData.email ?? ""
    )
    : "";
  const passwordError = submitted
    ? validateField(
      "password",
      formData.password ?? ""
    )
    : "";
  const isLoading = loginMutation.isPending;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
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
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email ?? ""}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-4 py-3 border rounded-lg ${emailError
                ? "border-red-500"
                : "border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {emailError && (
              <p className="text-red-500 text-sm mt-1">
                {emailError}
              </p>
            )}
          </div>
          <div>
            <div className="relative">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                placeholder="Password"
                value={formData.password ?? ""}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-lg pr-12 ${passwordError
                  ? "border-red-500"
                  : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />

              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() =>
                  setShowPassword((prev) => !prev)
                }
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-red-500 text-sm mt-1">
                {passwordError}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Signing in..."
              : "Sign in"}
          </button>
          <p className="text-center text-gray-600 text-sm mt-6">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="text-blue-600 font-medium hover:text-blue-800"
            >
              Sign up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
export default Login;