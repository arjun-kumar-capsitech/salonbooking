import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { getSalonBookingAPI } from "../../api/generated";

const { registerCustomer, registerAdmin } = getSalonBookingAPI();

function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userType, setUserType] = useState("Customer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNo: "",
    salonName: "",
    salonAddress: "",
    password: "",
    confirmPassword: ""
  });

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "fullName":
        if (!value.trim()) return "Full name is required";
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!value.includes("@") || !value.includes(".")) return "Email must contain '@' and '.'";
        if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(value)) return "Please enter a valid email address";
        return "";
      case "phoneNo":
        if (!value.trim()) return "Phone number is required";
        if (!/^\d{10}$/.test(value)) return "Phone number must be exactly 10 digits";
        return "";
      case "salonName":
        if (userType === "Admin" && !value.trim()) return "Salon name is required";
        return "";
      case "salonAddress":
        if (userType === "Admin" && !value.trim()) return "Salon address is required";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        return "";
      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (submitted) setError("");
  };

  const getFieldError = (field: string) => {
    return submitted ? validateField(field, formData[field as keyof typeof formData]) : "";
  };

  const isFormValid = () => {
    const fields = userType === "Admin"
      ? ["fullName", "email", "phoneNo", "salonName", "salonAddress", "password", "confirmPassword"]
      : ["fullName", "email", "phoneNo", "password", "confirmPassword"];

    return fields.every(field => !validateField(field, formData[field as keyof typeof formData]));
  };

  const customerRegisterMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await registerCustomer(data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.status === true) {
        setSuccess(data.message || "Registration successful!");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(data.message || "Registration failed");
      }
    },
    onError: (err: any) => {
      const errorMessage = err?.response?.data?.message || "Connection error. Please try again.";
      setError(errorMessage);
    }
  });

  const adminRegisterMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await registerAdmin(data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.status === true) {
        setSuccess(data.message || "Registration successful!");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(data.message || "Registration failed");
      }
    },
    onError: (err: any) => {
      const errorMessage = err?.response?.data?.message || "Connection error. Please try again.";
      setError(errorMessage);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    setSuccess("");

    if (!isFormValid()) return;

    if (userType === "Customer") {
      customerRegisterMutation.mutate({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNo,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
    } else {
      adminRegisterMutation.mutate({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNo,
        salonName: formData.salonName,
        salonAddress: formData.salonAddress,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
    }
  };

  const isLoading = customerRegisterMutation.isPending || adminRegisterMutation.isPending;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign up</h1>
          <p className="text-gray-600 text-sm">Fill your information below</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div className="flex gap-4 mb-8 justify-center">
          <button
            type="button"
            onClick={() => { setUserType("Admin"); setSubmitted(false); setError(""); }}
            className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all ${
              userType === "Admin"
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-gray-300 text-gray-500 hover:border-gray-400"
            }`}
            disabled={isLoading}
          >
            Barber Shop
          </button>
          <button
            type="button"
            onClick={() => { setUserType("Customer"); setSubmitted(false); setError(""); }}
            className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all ${
              userType === "Customer"
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-gray-300 text-gray-500 hover:border-gray-400"
            }`}
            disabled={isLoading}
          >
            Customer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getFieldError("fullName") ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
            />
            {getFieldError("fullName") && <p className="text-red-500 text-sm mt-1">{getFieldError("fullName")}</p>}
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getFieldError("email") ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
            />
            {getFieldError("email") && <p className="text-red-500 text-sm mt-1">{getFieldError("email")}</p>}
          </div>

          <div>
            <input
              type="tel"
              name="phoneNo"
              placeholder="Phone No."
              value={formData.phoneNo}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getFieldError("phoneNo") ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
            />
            {getFieldError("phoneNo") && <p className="text-red-500 text-sm mt-1">{getFieldError("phoneNo")}</p>}
          </div>

          {userType === "Admin" && (
            <>
              <div>
                <input
                  type="text"
                  name="salonName"
                  placeholder="Salon Name"
                  value={formData.salonName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getFieldError("salonName") ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {getFieldError("salonName") && <p className="text-red-500 text-sm mt-1">{getFieldError("salonName")}</p>}
              </div>
              <div>
                <textarea
                  name="salonAddress"
                  placeholder="Salon Address"
                  value={formData.salonAddress}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getFieldError("salonAddress") ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                  rows={2}
                />
                {getFieldError("salonAddress") && <p className="text-red-500 text-sm mt-1">{getFieldError("salonAddress")}</p>}
              </div>
            </>
          )}

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  getFieldError("password") ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {getFieldError("password") && <p className="text-red-500 text-sm mt-1">{getFieldError("password")}</p>}
          </div>

          <div>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  getFieldError("confirmPassword") ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {getFieldError("confirmPassword") && <p className="text-red-500 text-sm mt-1">{getFieldError("confirmPassword")}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : "Sign Up"}
          </button>

          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{" "}
            <a href="/" className="text-blue-600 font-medium hover:text-blue-800">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
export default Register;