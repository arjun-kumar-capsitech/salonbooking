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
      <Card className="h-full rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="flex">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mr-4"
            style={{
              backgroundColor: `${color}20`,
            }}
          >
            <span style={{ color, fontSize: '19px' }}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold  mb-1 " style={{ color: "#313b0d", fontFamily: "sans-serif", }}>{title}</h4>
            <div
              className="text-2xl font-medium mt-1"
              style={{
                color: "#073303",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {value}
            </div>       
               </div>
        </div>
      </Card>
    </>
  );
};

export const InfoCard: React.FC<InfoCardProps> = ({ title, description, tags = [], status, onView, onEdit }) => {
  return (
    <>
      <Card
        className="shadow-sm hover:shadow-md transition-shadow"
        actions={onView || onEdit ? [
          onView && <Button size="small" icon={<EyeOutlined />} onClick={onView}>View</Button>,
          onEdit && <Button size="small" icon={<EditOutlined />} onClick={onEdit}>Edit</Button>
        ].filter(Boolean) : undefined}
      >
        <div className="flex justify-between items-start gap-5">
          <div className="flex">
            <h4 className="font-semibold text-base mb-1">{title}</h4>
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