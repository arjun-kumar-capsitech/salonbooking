import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userType, setUserType] = useState("Customer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
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
              onClick={() => setUserType("Admin")}
              className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all ${userType === "Admin"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-gray-300 text-gray-500 hover:border-gray-400"
                }`}
            >
              Barber Shop
            </button>
            <button
              type="button"
              onClick={() => setUserType("Customer")}
              className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all ${userType === "Customer"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-gray-300 text-gray-500 hover:border-gray-400"
                }`}
            >
              Customer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
            <input
              type="tel"
              placeholder="Phone No."
              value={formData.phoneNo}
              onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />

            {userType === "Admin" && (
              <>
                <input
                  type="text"
                  placeholder="Salon Name"
                  value={formData.salonName}
                  onChange={(e) => setFormData({ ...formData, salonName: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <textarea
                  placeholder="Salon Address"
                  value={formData.salonAddress}
                  onChange={(e) => setFormData({ ...formData, salonAddress: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
                />
              </>
            )}

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
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

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
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
