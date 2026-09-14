import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { Input, Button, Card, message } from "antd";

import {
  getSalonBookingAPI,
  type PasswordDto,
  type StringApiResponse,
} from "../../api/generated";

const { postApiUserForgotPassword } = getSalonBookingAPI();

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const forgotPasswordMutation = useMutation<
    StringApiResponse,
    AxiosError<{ message?: string }>,
    PasswordDto
  >({
    mutationFn: async (data: PasswordDto) => {
      const response = await postApiUserForgotPassword(data);

      return response.data;
    },

    onSuccess: (data) => {
      if (!data) {
        setError("No response from server");
        return;
      }

      if (!data.status) {
        setError(
          data.message || "Unable to send password reset link"
        );
        return;
      }

      message.success(
        data.message ||
          "If this email exists, a password reset link has been sent"
      );

      setEmail("");
      setSubmitted(false);
      setError("");
    },

    onError: (error) => {
      setError(
        error.response?.data?.message ||
          "Server error. Please try again."
      );
    },
  });

  const validateEmail = (value: string): string => {
    if (!value.trim()) {
      return "Email is required";
    }

    if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(value)) {
      return "Please enter a valid email address";
    }

    return "";
  };

  const emailError = submitted
    ? validateEmail(email)
    : "";

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setSubmitted(true);
    setError("");

    const validationError = validateEmail(email);

    if (validationError) {
      return;
    }

    const data: PasswordDto = {
      email: email.trim(),
    };

    forgotPasswordMutation.mutate(data);
  };

  const isLoading = forgotPasswordMutation.isPending;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <Card
        className="w-full max-w-sm"
        styles={{
          body: {
            padding: "32px",
          },
        }}
      >
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Forgot Password?
        </h1>

        <p className="text-gray-500 text-sm text-center mb-6">
          Enter your registered email address and we will send
          you a password reset link.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <Input
              size="large"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              disabled={isLoading}
              status={emailError ? "error" : ""}
            />

            {emailError && (
              <p className="text-red-500 text-sm mt-1">
                {emailError}
              </p>
            )}
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isLoading}
          >
            {isLoading
              ? "Sending..."
              : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => navigate("/login")}
            disabled={isLoading}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Back to Login
          </button>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;