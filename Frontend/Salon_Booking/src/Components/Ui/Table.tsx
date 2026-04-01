import { Table, Space, Button, Tag, Modal, } from 'antd';
import { ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { Pencil, Trash2 } from 'lucide-react';

const { confirm } = Modal;

interface StatusBadgeProps {
    type: 'salon' | 'user' | 'booking';
    value: string;
}

interface DataTableProps {
    data: any[];
    columns: ColumnsType<any>;
    loading?: boolean;
    onView?: (record: any) => void;
    onEdit?: (record: any) => void;
    onDelete?: (record: any) => void;
    showActions?: boolean;
    rowKey?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
    const configs: Record<string, Record<string, {
        color: string;
        icon: React.ReactNode;
        text: string;
    }>> = {
        salon: {
            active: {
                color: 'green', text: 'Active',
                icon: undefined
            },
            pending: {
                color: 'orange', text: 'Pending',
                icon: undefined
            },
            suspended: {
                color: 'red', text: 'Suspended',
                icon: undefined
            }
        },
        user: {
            active: {
                color: 'green', text: 'Active',
                icon: undefined
            },
            inactive:
            {
                color: 'red',
                text: 'Inactive',
                icon: undefined
            }
        },
        booking: {
            confirmed: {
                color: 'green', text: 'Confirmed',
                icon: undefined
            },
            pending: {
                color: 'orange', text: 'Pending',
                icon: undefined
            },
            cancelled: {
                color: 'red', text: 'Cancelled',
                icon: undefined
            },
            completed: {
                color: 'blue', text: 'Completed',
                icon: undefined
            }
        }
    };

    const config = configs[type]?.[value] || {
        color: 'default',
        icon: null,
        text: value
    };

    return (
        <>
        <Tag
            color={config.color}
            icon={config.icon}
            className="font-semibold"
            style={{ border: "none", background: "transparent" }}
        >
            {config.text}
        </Tag>
        </>
    );
};

export const DataTable: React.FC<DataTableProps> = ({
    data = [],
    columns = [],
    loading = false,
    onView,
    onEdit,
    onDelete,
    showActions = true,
    rowKey = 'id'
}) => {

    const handleDeleteClick = (record: any, e: React.MouseEvent) => {
        e.stopPropagation();

        confirm({
            title: 'Are you delete this record?',
            icon: <ExclamationCircleOutlined style={{ color: '#ff0004' }} />,
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk() {
                if (onDelete) {
                    onDelete(record);
                }
            },
            onCancel() {
                console.log('Delete cancelled');
            },
        });
    };

    const actionColumn: ColumnType<any> = {
        title: 'Actions',
        key: 'actions',
        width: 140,
        fixed: 'right' as const,
        render: (_, record) => (
            <Space size="small" style={{ border: 'none', padding: 0, margin: 0 }}>
                {onView && (
                    <Button
                        size="small"
                        icon={<EyeOutlined className='w-4 h-4' />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onView(record);
                        }}
                        title="View Details"
                        style={{
                            border: 'none',
                            boxShadow: 'none',
                            padding: '2px 6px'
                        }}
                        className="hover:bg-blue-50 hover:text-blue-600"
                    />
                )}
                {onEdit && (
                    <Button
                        size="small"
                        icon={<Pencil className='h-4 w-4' />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(record);
                        }}
                        title="Edit"
                        style={{
                            border: 'none',
                            boxShadow: 'none',
                            padding: '2px 6px'
                        }}
                        className="hover:bg-green-50 hover:text-green-600"
                    />
                )}
                {onDelete && (
                    <Button
                        size="small"
                        danger
                        icon={<Trash2 className='w-4 h-4' />}
                        onClick={(e) => handleDeleteClick(record, e)}
                        title="Delete"
                        style={{
                            border: 'none',
                            boxShadow: 'none',
                            padding: '2px 6px'
                        }}
                        className="hover:bg-red-50"
                    />
                )}
            </Space>
        ),
    };

    const tableColumns: ColumnsType<any> = showActions
        ? [...columns, actionColumn] as ColumnsType<any>
        : columns;

    return (
        <>
            <Table
                dataSource={data}
                columns={tableColumns}
                loading={loading}
                pagination={{
                    pageSize: 4,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} items`,
                }}
                size="middle"
                rowKey={rowKey}
                scroll={{ x: 'max-content' }}
                className="[&_.ant-space]:border-0"
            />

        </>
    );
};