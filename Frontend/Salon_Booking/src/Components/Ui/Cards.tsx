import { Card, Tag, Button } from 'antd';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  change?: number;
}

interface InfoCardProps {
  title: string;
  description?: string;
  tags?: string[];
  status?: 'active' | 'pending' | 'completed' | 'inactive';
  onView?: () => void;
  onEdit?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
}) => {
  return (
    <>
      <Card className="h-full border-0 shadow-sm hover:shadow-md">
        <div className="flex">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mr-4"
            style={{
              backgroundColor: `${color}20`,
            }}
          >
            <span style={{ color, fontSize: '19px' }}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0  ">
            <div className="text-[#216869] font-semibold">{title}</div>
            <div className="text-2xl font-semibold mt-1 text-[#161a1d]">{value}</div>
          </div>
        </div>
      </Card>
    </>
  );
};

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  tags = [],
  status,
  onView,
  onEdit
}) => {
  return (
    <>
      <Card
        className="border-0 shadow-sm hover:shadow-md transition-shadow"
        actions={onView || onEdit ? [
          onView && <Button size="small" icon={<EyeOutlined />} onClick={onView}>View</Button>,
          onEdit && <Button size="small" icon={<EditOutlined />} onClick={onEdit}>Edit</Button>
        ].filter(Boolean) : undefined}
      >
        <div className="flex justify-between items-start gap-5">
          <div className="flex">
            <h3 className="font-semibold text-base mb-1 truncate">{title}</h3>
            {description && (
              <p className="text-gray-600 text-sm mb-2 ">{description}</p>
            )}
            {tags.length > 0 && (
              <div>
                {tags.map((tag,) => (
                  <Tag
                    className="text-xs"
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </div>
          {status && (
            <Tag
              color={
                status === 'active' ? 'green' :
                  status === 'pending' ? 'orange' :
                    status === 'completed' ? 'blue' : 'red'
              }
              className="flex-shrink-0 text-xs"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Tag>
          )}
        </div>
      </Card>
    </>
  );
};