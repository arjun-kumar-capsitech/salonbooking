import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const API_URL = "http://localhost:5296/api/User/register";

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "fullName":
        if (!value.trim()) return "Full name is required";
        if (!/^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/.test(value.trim())) {
          return "First letter of each word must be capital";
        }
       
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!value.includes("@") || !value.includes(".")) {
          return "Email must contain '@' and '.'";
        }
        if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(value)) {
          return "Please enter a valid email address";
        }
        return "";
      
      case "phoneNo":
        if (!value.trim()) return "Phone number is required";
        if (!/^\d{10}$/.test(value)) {
          return "Phone number must be exactly 10 digits";
        }
        return "";
      
      case "salonName":
        if (userType === "Admin" && !value.trim()) {
          return "Salon name is required";
        }
        return "";
      
      case "salonAddress":
        if (userType === "Admin" && !value.trim()) {
          return "Salon address is required";
        }
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

  const getAllErrors = () => {
    return {
      fullName: validateField("fullName", formData.fullName),
      email: validateField("email", formData.email),
      phoneNo: validateField("phoneNo", formData.phoneNo),
      salonName: validateField("salonName", formData.salonName),
      salonAddress: validateField("salonAddress", formData.salonAddress),
      password: validateField("password", formData.password),
      confirmPassword: validateField("confirmPassword", formData.confirmPassword)
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    const errors = getAllErrors();
    const requiredFields = userType === "Admin" 
      ? ["fullName", "email", "phoneNo", "salonName", "salonAddress", "password", "confirmPassword"]
      : ["fullName", "email", "phoneNo", "password", "confirmPassword"];
    
    for (const field of requiredFields) {
      if (errors[field as keyof typeof errors]) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    setSuccess("");

    if (!isFormValid()) {
      return;
    }

    try {
      const endpoint =
        userType === "Customer"
          ? `${API_URL}/customer`
          : `${API_URL}/admin`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "*/*"
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNo,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          salonName: userType === "Admin" ? formData.salonName : undefined,
          salonAddress: userType === "Admin" ? formData.salonAddress : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(result.message || "Registration successful!");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(result.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Connection error. Please check backend server.");
    }
  };

  const errors = getAllErrors();

  return (
    <>
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
              onClick={() => {
                setUserType("Admin");
                setSubmitted(false);
              }}
              className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all ${userType === "Admin"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-gray-300 text-gray-500 hover:border-gray-400"
                }`}
            >
              Barber Shop
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType("Customer");
                setSubmitted(false);
              }}
              className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all ${userType === "Customer"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-gray-300 text-gray-500 hover:border-gray-400"
                }`}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
              {submitted && errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
              {submitted && errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <input
                type="tel"
                name="phoneNo"
                placeholder="Phone No."
                value={formData.phoneNo}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
              {submitted && errors.phoneNo && (
                <p className="text-red-500 text-sm mt-1">{errors.phoneNo}</p>
              )}
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                  {submitted && errors.salonName && (
                    <p className="text-red-500 text-sm mt-1">{errors.salonName}</p>
                  )}
                </div>

                <div>
                  <textarea
                    name="salonAddress"
                    placeholder="Salon Address"
                    value={formData.salonAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
                  />
                  {submitted && errors.salonAddress && (
                    <p className="text-red-500 text-sm mt-1">{errors.salonAddress}</p>
                  )}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-12"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {submitted && errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-12"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {submitted && errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-4"
            >
              Sign Up
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
    </>
  );
}
export default Register;