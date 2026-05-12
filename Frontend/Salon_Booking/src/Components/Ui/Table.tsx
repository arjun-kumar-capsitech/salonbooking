import React from "react";
import { Table, Space, Button, Tag, Modal } from "antd";
import { ExclamationCircleOutlined, EyeOutlined,} from "@ant-design/icons";
import type {ColumnsType,ColumnType,} from "antd/es/table";
import { Pencil, Trash2 } from "lucide-react";
const { confirm } = Modal;

interface StatusBadgeProps {
    type: "salon" | "user" | "booking";
    value: string;
}

interface DataTableProps {
    data: any[];
    columns?: ColumnsType<any>;
    loading?: boolean;
    onView?: (record: any) => void;
    onEdit?: (record: any) => void;
    onDelete?: (record: any) => void;
    showActions?: boolean;
    rowKey?: string;
    tableType?:
    | "services"
    | "bookings"
    | "staff"
    | "users"
    | "companies"
    | "requests";
}

export const StatusBadge: React.FC<
    StatusBadgeProps
> = ({ type, value }) => {
    const configs: Record<
        string,
        Record<
            string,
            {
                color: string;
                icon?: React.ReactNode;
                text: string;
            }
        >
    > = {
        salon: {
            active: {
                color: "green",
                text: "Active",
            },

            pending: {
                color: "orange",
                text: "Pending",
            },

            suspended: {
                color: "red",
                text: "Suspended",
            },
        },

        user: {
            active: {
                color: "green",
                text: "Active",
            },

            inactive: {
                color: "red",
                text: "Inactive",
            },
        },

        booking: {
            confirmed: {
                color: "green",
                text: "Confirmed",
            },

            pending: {
                color: "orange",
                text: "Pending",
            },

            cancelled: {
                color: "red",
                text: "Cancelled",
            },

            completed: {
                color: "blue",
                text: "Completed",
            },
        },
    };

    const config = configs[type]?.[value] || {
        color: "default",
        text: value,
    };
    return (
        <Tag
            color={config.color}
            icon={config.icon}
            className="font-semibold"
            style={{
                border: "none",
                background: "transparent",
            }}
        >
            {config.text}
        </Tag>
    );
};

export const DataTable: React.FC<
    DataTableProps
> = ({
    data = [],
    columns: propColumns,
    loading = false,
    onView,
    onEdit,
    onDelete,
    showActions = true,
    rowKey = "id",
    tableType = "bookings",
}) => {
        // Column Mapping
        const columnMapping: Record<string, string> =
        {
            Customer: "customerName",
            Service: "serviceName",
            Staff: "staffName",
            Appointment: "appointmentDate",
            Date: "date",
            Time: "time",
            Amount: "amount",
            Status: "status",

            "Service Name": "serviceName",
            Duration: "duration",
            Price: "price",

            "Staff Name": "staffName",
            Email: "email",
            "Joining Date": "joined",
            Role: "role",

            "User Name": "fullName",

            Company: "companyName",
            "Company Name": "companyName",

            Owner: "owner",

            "Request Date": "requestDate",
        };

        const tableColumnsMap: Record<
            string,
            string[]
        > = {
            services: [
                "Service Name",
                "Duration",
                "Price",
                "Status",
            ],
            bookings: [
                "Customer",
                "Service",
                "Staff",
                "Appointment",
                "Amount",
                "Status",
            ],

            staff: [
                "Staff Name",
                "Email",
                "Phone",
                "Role",
                "Status",
            ],

            users: [
                "User Name",
                "Email",
                "Phone",
                "Role",
                "Status",
            ],

            companies: [
                "Company Name",
                "Owner",
                "Email",
                "Phone",
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

        const getCustomRender = (
            columnTitle: string
        ) => {
        
            if (
                columnTitle === "Amount" ||
                columnTitle === "Price"
            ) {
                return (value: number) => {
                    if (
                        value === undefined ||
                        value === null
                    )
                        return "-";

                    return `$${value}`;
                };
            }

         
            if (columnTitle === "Status") {
                let type: any = "booking";
                if (tableType === "services")
                    type = "salon";
                if (tableType === "users")
                    type = "user";

                return (status: string) => {
                    if (!status) return "-";
                    return (
                        <StatusBadge
                            type={type}
                            value={status}
                        />
                    );
                };
            }

            return (text: any) => {
                if (
                    text === undefined ||
                    text === null
                )
                    return "-";
                return text;
            };
        };

        let finalColumns: ColumnsType<any> =
            propColumns || [];

        if (!propColumns) {
            const dynamicColumns =
                tableColumnsMap[tableType] || [];

            finalColumns = dynamicColumns.map(
                (col: string) => ({
                    title: col,
                    dataIndex:
                        columnMapping[col] ||
                        col.toLowerCase().replace(/ /g, "_"),
                    key: col,
                    render: getCustomRender(col),
                })
            );
        }

   
        const handleDeleteClick = (
            record: any,
            e: React.MouseEvent
        ) => {
            e.stopPropagation();

            confirm({
                title:
                    "Are you sure you want to delete this record?",

                icon: (
                    <ExclamationCircleOutlined
                        style={{ color: "#ff0004" }}
                    />
                ),

                okText: "Yes",
                okType: "danger",
                cancelText: "No",

                onOk() {
                    if (onDelete) onDelete(record);
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
                    }}
                >
                    {onView && (
                        <Button
                            size="small"
                            icon={
                                <EyeOutlined className="w-4 h-4" />
                            }
                            onClick={(e) => {
                                e.stopPropagation();
                                onView(record);
                            }}
                            title="View Details"
                            style={{
                                border: "none",
                                boxShadow: "none",
                                padding: "2px 6px",
                            }}
                            className="hover:bg-blue-50 hover:text-blue-600"
                        />
                    )}

                    {onEdit && (
                        <Button
                            size="small"
                            icon={
                                <Pencil className="h-4 w-4" />
                            }
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(record);
                            }}
                            title="Edit"
                            style={{
                                border: "none",
                                boxShadow: "none",
                                padding: "2px 6px",
                            }}
                            className="hover:bg-green-50 hover:text-green-600"
                        />
                    )}

                    {onDelete && (
                        <Button
                            size="small"
                            danger
                            icon={
                                <Trash2 className="w-4 h-4" />
                            }
                            onClick={(e) =>
                                handleDeleteClick(record, e)
                            }
                            title="Delete"
                            style={{
                                border: "none",
                                boxShadow: "none",
                                padding: "2px 6px",
                            }}
                            className="hover:bg-red-50"
                        />
                    )}
                </Space>
            ),
        };

        const tableColumns: ColumnsType<any> =
            showActions
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