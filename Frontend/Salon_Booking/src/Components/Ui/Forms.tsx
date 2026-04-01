import { Input, Select, Form } from 'antd';
import { type Rule } from 'antd/es/form';

const { Option } = Select;

interface InputFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'password' | 'email' | 'number';
  prefix?: React.ReactNode;
  rules?: Rule[];
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
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  placeholder,
  required = false,
  type = 'text',
  prefix,
  rules = []
}) => {
  const allRules: Rule[] = [
    ...(required ? [{ required: true, message: `Please enter ${label.toLowerCase()}` }] : []),
    ...rules
  ];

  return (
    <>
      <Form.Item
        label={<span className="font-semibold">{label}</span>}
        name={name}
        rules={allRules}
      >
        {type === 'password' ? (
          <Input.Password placeholder={placeholder} prefix={prefix} />
        ) : (
          <Input placeholder={placeholder} prefix={prefix} type={type} />
        )}
      </Form.Item>
    </>
  );
};

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  placeholder,
  required = false,
  options = [],
  rules = []
}) => {
  const allRules: Rule[] = [
    ...(required ? [{ required: true, message: `Please select ${label.toLowerCase()}` }] : []),
    ...rules
  ];

  return (
    <>
      <Form.Item
        label={<span className="font-semibold">{label}</span>}
        name={name}
        rules={allRules}
      >
        <Select placeholder={placeholder}>
          {options.map(option => (
            <Option key={String(option.value)} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </>
  );
};