import React from "react";
import { Form, Input, Select } from "antd";
import type { Rule } from "antd/es/form";
import type { ReactNode } from "react";

const { Option } = Select;

interface InputFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "password" | "email" | "number";
  prefix?: ReactNode;
  rules?: Rule[];
  className?: string;
}

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  options?: SelectOption[];
  rules?: Rule[];
  className?: string;
}

const inputClass =
  "rounded-lg h-11 hover:border-blue-400 focus:border-blue-500";

export const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  placeholder,
  required = false,
  type = "text",
  prefix,
  rules = [],
  className = "",
}) => {
  const validationRules: Rule[] = [
    ...(required
      ? [
          {
            required: true,
            message: `Please enter ${label.toLowerCase()}`,
          },
        ]
      : []),
    ...rules,
  ];

  return (
    <Form.Item
      label={
        <span className="font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      }
      name={name}
      rules={validationRules}
      className={className}
    >
      {type === "password" ? (
        <Input.Password
          placeholder={placeholder}
          prefix={prefix}
          size="large"
          className={inputClass}
        />
      ) : (
        <Input
          type={type}
          placeholder={placeholder}
          prefix={prefix}
          size="large"
          className={inputClass}
        />
      )}
    </Form.Item>
  );
};

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  placeholder,
  required = false,
  options = [],
  rules = [],
  className = "",
}) => {
  const validationRules: Rule[] = [
    ...(required
      ? [
          {
            required: true,
            message: `Please select ${label.toLowerCase()}`,
          },
        ]
      : []),
    ...rules,
  ];

  return (
    <Form.Item
      label={
        <span className="font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      }
      name={name}
      rules={validationRules}
      className={className}
    >
      <Select
        placeholder={placeholder}
        size="large"
        className="rounded-lg"
      >
        {options.map((option) => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Select>
    </Form.Item>
  );
};