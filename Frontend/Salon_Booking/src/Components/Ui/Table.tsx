import React from "react";
import { Table, Space, Button, Tag, Modal } from "antd";
import { ExclamationCircleOutlined, EyeOutlined } from "@ant-design/icons";
import type { ColumnsType, ColumnType } from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";

const { confirm } = Modal;

interface StatusBadgeProps {
  type: "salon" | "service" | "user" | "booking" | "request";
  value: string;
}

interface DataTableProps {
  data: any[];
  columns?: ColumnsType<any>;
  loading?: boolean;
  onView?: (record: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onCancel?: (record: any) => void;
  showActions?: boolean;
  rowKey?: string;
  tableType?: "services" | "bookings" | "staff" | "users" | "companies" | "requests";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  const configs: Record<string, Record<string, { color: string; text: string }>> = {
    salon: {
      active: { color: "#15803d", text: "Active" },
      inactive: { color: "#b91c1c", text: "Inactive" },
      pending: { color: "#b45309", text: "Pending" },
      suspended: { color: "#b91c1c", text: "Suspended" },
    },
    service: {
      active: { color: "#15803d", text: "Active" },
      inactive: { color: "#b91c1c", text: "Inactive" },
      pending: { color: "#b45309", text: "Pending" },
    },
    user: {
      active: { color: "#15803d", text: "Active" },
      inactive: { color: "#b91c1c", text: "Inactive" },
    },
    booking: {
      confirmed: { color: "#15803d", text: "Confirmed" },
      pending: { color: "#b45309", text: "Pending" },
      cancelled: { color: "#b91c1c", text: "Cancelled" },
      completed: { color: "#1d4ed8", text: "Completed" },
    },
    request: {
      approved: { color: "#16a34a", text: "Approved" },
      rejected: { color: "#dc2626", text: "Rejected" },
      pending: { color: "#d97706", text: "Pending" },
    },
  };

  const status = String(value ?? "").toLowerCase();

  const config = configs[type]?.[status] || {
    color: "#374151",
    text: value || "-",
  };

  return (
    <Tag
      style={{
        color: config.color,
        background: "transparent",
        border: "none",
        padding: "3px 10px",
        margin: 0,
        fontFamily: "Public Sans, sans-serif",
        fontWeight: 600,
      }}
    >
      {config.text}
    </Tag>
  );
};

export const DataTable: React.FC<DataTableProps> = ({
  data = [],
  columns: propColumns,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onCancel,
  showActions = true,
  rowKey = "id",
  tableType = "bookings",
}) => {
  const columnMapping: Record<string, string> = {
    Customer: "customerName",
    "Customer Name": "customerName",
    Service: "serviceName",
    Staff: "staffName",
    Appointment: "appointmentDate",
    "Date & Time": "appointmentDate",
    Date: "date",
    Time: "time",
    Amount: "amount",
    Status: "status",
    "Service Name": "serviceName",
    Duration: "duration",
    Price: "price",
    "Staff Name": "name",
    Email: "email",
    Phone: "phone",
    "Joining Date": "joined",
    "Joined Date": "joined",
    Role: "role",
    "User Name": "fullName",
    Company: "salonName",
    "Company Name": "salonName",
    Owner: "owner",
    "Request Date": "requestDate",
    "Salon Name": "salonName",
    "Salon Address": "salonAddress",
  };

  const tableColumnsMap: Record<string, string[]> = {
    services: ["Service Name", "Duration", "Price", "Status"],
    bookings: [
      "Customer Name",
      "Salon Name",
      "Service",
      "Date & Time",
      "Staff",
      "Amount",
      "Status",
    ],
    staff: ["Staff Name", "Email", "Role", "Status"],
    users: ["User Name", "Email", "Phone", "Role", "Status"],
    companies: [
      "Company Name",
      "Owner",
      "Email",
      "Phone",
      "Salon Address",
      "Status",
    ],
    requests: [
      "Company Name",
      "Owner",
      "Email",
      "Request Date",
      "Status",
    ],
  };

  const getCustomRender = (columnTitle: string) => {
    if (columnTitle === "Amount" || columnTitle === "Price") {
      return (value: number) =>
        value === undefined || value === null
          ? "-"
          : `$${Number(value).toFixed(2)}`;
    }

    if (columnTitle === "Status") {
      let type: StatusBadgeProps["type"] = "booking";

      if (tableType === "services") type = "service";
      if (tableType === "companies") type = "salon";
      if (tableType === "staff" || tableType === "users") type = "user";
      if (tableType === "requests") type = "request";

      return (status: string) =>
        !status ? "-" : <StatusBadge type={type} value={status} />;
    }

    return (text: any) =>
      text === undefined || text === null ? "-" : text;
  };

  let finalColumns: ColumnsType<any> = propColumns || [];

  if (!propColumns) {
    const dynamicColumns = tableColumnsMap[tableType] || [];

    finalColumns = dynamicColumns.map((col) => ({
      title: col,
      dataIndex:
        columnMapping[col] || col.toLowerCase().replace(/ /g, "_"),
      key: col,
      render: getCustomRender(col),
    }));
  }

  const handleDeleteClick = (record: any, e: React.MouseEvent) => {
    e.stopPropagation();

    confirm({
      title: "Are you sure you want to delete this record?",
      icon: <ExclamationCircleOutlined style={{ color: "#ff0004" }} />,
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        onDelete?.(record);
      },
    });
  };

  const actionColumn: ColumnType<any> = {
    title: "Actions",
    key: "actions",
    width: 140,
    fixed: "right",
    render: (_, record) => (
      <Space
        size="small"
        style={{
          border: "none",
          padding: 0,
          margin: 0,
          fontFamily: "Public Sans, sans-serif",
          fontWeight: "normal",
        }}
      >
        {onView && (
          <Button
            size="small"
            icon={<EyeOutlined className="w-4 h-4" />}
            onClick={(e) => {
              e.stopPropagation();
              onView(record);
            }}
            title="View Details"
            style={{
              border: "none",
              boxShadow: "none",
              padding: "2px 6px",
              fontFamily: "Public Sans, sans-serif",
              fontWeight: "normal",
            }}
            className="hover:bg-blue-50 hover:text-blue-600"
          />
        )}

        {onEdit && (
          <Button
            size="small"
            icon={<Pencil className="h-4 w-4" />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(record);
            }}
            title="Edit"
            style={{
              border: "none",
              boxShadow: "none",
              padding: "2px 6px",
              fontFamily: "Public Sans, sans-serif",
              fontWeight: "normal",
            }}
            className="hover:bg-green-50 hover:text-green-600"
          />
        )}

        {onDelete && (
          <Button
            size="small"
            danger
            icon={<Trash2 className="w-4 h-4" />}
            onClick={(e) => handleDeleteClick(record, e)}
            title="Delete"
            style={{
              border: "none",
              boxShadow: "none",
              padding: "2px 6px",
              fontFamily: "Public Sans, sans-serif",
              fontWeight: "normal",
            }}
            className="hover:bg-red-50"
          />
        )}

        {onCancel && (
          <Button
            type="link"
            danger
            size="small"
            icon={<span className="text-red-500">×</span>}
            onClick={(e) => {
              e.stopPropagation();
              onCancel(record);
            }}
            disabled={
              record.status === "cancelled" ||
              record.status === "completed"
            }
            className="hover:scale-105 transition-transform"
          >
            Cancel
          </Button>
        )}
      </Space>
    ),
  };

  const tableColumns: ColumnsType<any> =
    showActions || onCancel
      ? [...finalColumns, actionColumn]
      : finalColumns;

  return (
    <Table
      dataSource={data}
      columns={tableColumns}
      loading={loading}
      rowKey={rowKey}
      size="middle"
      scroll={{ x: "max-content" }}
      className="[&_.ant-space]:border-0"
      style={{
        fontFamily: "Public Sans, sans-serif",
        fontWeight: "normal",
      }}
      pagination={{
        pageSize: 4,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} of ${total} items`,
      }}
    />
  );
};