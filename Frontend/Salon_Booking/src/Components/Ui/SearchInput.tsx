import { Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";

interface SearchOption {
  value: string;
  label: string;
}

interface SearchInputProps {
  searchText: string;
  onSearchChange: (value: string) => void;

  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: SearchOption[];

  role?: string;
  onRoleChange?: (value: string) => void;
  roleOptions?: SearchOption[];

  placeholder?: string;
  width?: number;
}

const SearchInput = ({
  searchText,
  onSearchChange,

  status = "all",
  onStatusChange,
  statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ],

  role = "all",
  onRoleChange,
  roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "Admin", label: "Admin" },
    { value: "Employee", label: "Employee" },
    { value: "Customer", label: "Customer" },
  ],

  placeholder = "Search...",
  width = 300,
}: SearchInputProps) => {
  return (
    <div className="flex gap-4 flex-wrap">
      <Input
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        style={{ width }}
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        allowClear
      />

      {onRoleChange && (
        <Select
          style={{ width: 140 }}
          value={role}
          onChange={onRoleChange}
          options={roleOptions}
        />
      )}

      {onStatusChange && (
        <Select
          style={{ width: 140 }}
          value={status}
          onChange={onStatusChange}
          options={statusOptions}
        />
      )}
    </div>
  );
};  
export default SearchInput;