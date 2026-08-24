interface FormErrorProps {
  message?: string;
}

export const validateField = (
  name: string,
  value: unknown,
  isEdit: boolean = false
): string => {
  switch (name) {
    case "name":
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return "Full name is required";
      }

      if (value.trim().length < 2) {
        return "Name must be at least 2 characters";
      }

      if (value.trim().length > 50) {
        return "Name must be less than 50 characters";
      }

      return "";

    case "email":
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return "Email is required";
      }

      if (
        !value.includes("@") ||
        !value.includes(".")
      ) {
        return "Email must contain '@' and '.'";
      }

      if (
        !/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(
          value
        )
      ) {
        return "Please enter a valid email address";
      }

      return "";

    case "password":
      if (!isEdit && !value) {
        return "Password is required";
      }

      if (
        value &&
        typeof value === "string" &&
        value.length < 6
      ) {
        return "Password must be at least 6 characters";
      }

      return "";


    case "customerName":
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return "Customer name is required";
      }

      if (value.trim().length < 2) {
        return "Customer name must be at least 2 characters";
      }

      if (value.trim().length > 50) {
        return "Customer name must be less than 50 characters";
      }

      return "";

    case "staff":
      if (!value) {
        return "Please select staff";
      }

      return "";

    case "services":
      if (!Array.isArray(value) || value.length === 0) {
        return "Please select at least one service";
      }

      return "";

    case "date":
      if (!value) {
        return "Please select date";
      }

      return "";

    case "timeSlot":
      if (!value) {
        return "Please select a time slot";
      }

      return "";

    case "salonName":
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return "Salon name is required";
      }

      return "";

    case "serviceName":
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return "Service name is required";
      }

      if (value.trim().length < 2) {
        return "Service name must be at least 2 characters";
      }

      if (value.trim().length > 100) {
        return "Service name must be less than 100 characters";
      }

      return "";

    case "price":
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return "Price is required";
      }

      if (isNaN(Number(value))) {
        return "Price must be a number";
      }

      if (Number(value) <= 0) {
        return "Price must be greater than 0";
      }

      return "";

    case "duration":
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return "Duration is required";
      }

      if (isNaN(Number(value))) {
        return "Duration must be a number";
      }

      if (Number(value) <= 0) {
        return "Duration must be greater than 0";
      }

      return "";

    default:
      return "";
  }

};

const FormError = ({
  message,
}: FormErrorProps) => {
  if (!message) return null;

  return (
    <p className="text-red-500 text-sm mt-1">
      {message}
    </p>
  );
};
export default FormError;