import { useState, useMemo } from "react";
import { Button, Input, message, Modal, Card, Spin } from "antd";
import { SearchOutlined, CheckOutlined, CloseOutlined, ShopOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuperAdminRequest } from "../../Redux/Store/Slice/columnsSlice";
import { DataTable } from "../../Components/Ui/Table";
import { getSalonBookingAPI } from '../../api/generated';

const { getAllUsers: getApiUser } = getSalonBookingAPI();
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = () => {
    switch (status) {
      case "approved": return { bg: "#f6ffed", color: "#52c41a", text: "Approved" };
      case "rejected": return { bg: "#fff2f0", color: "#ff4d4f", text: "Rejected" };
      default: return { bg: "#fff7e6", color: "#faad14", text: "Pending" };
    }
  };
  const { bg, color, text } = getStatusColor();
  return <span style={{ backgroundColor: bg, color: color, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 500, display: "inline-block" }}>{text}</span>;
};

const Request = () => {
  const dispatch = useDispatch();
  const [searchText, setSearchText] = useState("");
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };
  const ResponseData = (response: any) => {
    if (!response) return null;
    if (typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch {
        return null;
      }
    }
    return response.data;
  };

  dispatch(showSuperAdminRequest());
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['salonRequests'],
    enabled: !!token,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await getApiUser({ page: 1, pageSize:100 }, axiosConfig);
      const parsedData = ResponseData(response);
      
      if (!parsedData?.status || !parsedData?.result) {
        return [];
      }

      let rawUsers = [];
      const result = parsedData.result;
      
      if (Array.isArray(result)) {
        rawUsers = result;
      } else if (result?.data && Array.isArray(result.data)) {
        rawUsers = result.data;
      } else {
        rawUsers = [];
      }
      const savedStatus = JSON.parse(localStorage.getItem("salonStatus") || "{}");
      return rawUsers
        .filter((u: any) => u.role === 2 || u.Role === 2)
        .map((u: any) => ({
          id: u.id || u._id,
          companyName: u.salonName || u.SalonName || u.fullName || u.FullName || 'N/A',
          owner: u.fullName || u.FullName || u.name || 'N/A',
          email: u.email || u.Email || 'N/A',
          requestDate: u.createdAt || u.CreatedAt || new Date().toISOString(),
          status: savedStatus[u.id || u._id] || "pending",
        }));
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const savedStatus = JSON.parse(localStorage.getItem("salonStatus") || "{}");
      savedStatus[id] = status;
      localStorage.setItem("salonStatus", JSON.stringify(savedStatus));
      return { id, status };
    },
    onSuccess: ({ status }) => {
      message.success(`Request ${status === "approved" ? "Approved" : "Rejected"} Successfully`);
      queryClient.invalidateQueries({ queryKey: ['salonRequests'] });
      setViewModalVisible(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to update status');
    }
  });

  const handleApprove = (id: string) => {
    updateStatusMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: string) => {
    updateStatusMutation.mutate({ id, status: "rejected" });
  };

  const filteredRequests = useMemo(() => {
    if (!searchText) return requests;
    return requests.filter((r: any) =>
      r.companyName?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.owner?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [requests, searchText]);

  const columns = [
    {
      title: "Company Name",
      dataIndex: "companyName",
      render: (text: string, record: any) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-gray-500 text-sm">Owner: {record.owner}</div>
        </div>
      ),
    },
    { 
      title: "Email", 
      dataIndex: "email",
      render: (text: string) => <span>{text}</span>
    },
    { 
      title: "Request Date", 
      dataIndex: "requestDate", 
      render: (date: string) => new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
    { 
      title: "Status", 
      dataIndex: "status", 
      render: (status: string) => <StatusBadge status={status} /> 
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Salon Requests</h1>
          <p className="text-gray-600">Manage salon registration requests</p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4">
          <Input 
            placeholder="Search by company, owner or email" 
            prefix={<SearchOutlined />} 
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)} 
            style={{ width: 400 }} 
            allowClear
          />
        </div>
      </Card>

      <Card>
        <div className="p-2 font-medium mb-4">
          All Request Data
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Spin size="large" />
          </div>
        ) : (
          <DataTable 
            data={filteredRequests} 
            columns={columns} 
            loading={isLoading} 
            rowKey="id" 
            showActions={true} 
            onView={(record) => { 
              setSelectedRequest(record); 
              setViewModalVisible(true); 
            }} 
          />
        )}
      </Card>
      <Modal 
        title="Request Details" 
        open={viewModalVisible} 
        onCancel={() => { 
          setViewModalVisible(false); 
          setSelectedRequest(null); 
        }} 
        footer={null} 
        centered 
        width={520}
        destroyOnClose
      >
        {selectedRequest && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 pb-3 border-b">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShopOutlined className="text-blue-600 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{selectedRequest.companyName}</h3>
                <p className="text-gray-500 text-sm">Salon Registration Request</p>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">Owner Name</div>
              <div className="font-medium text-base">{selectedRequest.owner}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">Email Address</div>
              <div className="text-base">{selectedRequest.email}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">Request Date</div>
              <div className="text-base">
                {new Date(selectedRequest.requestDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">Current Status</div>
              <StatusBadge status={selectedRequest.status} />
            </div>
            
            {selectedRequest.status === "pending" && (
              <div className="flex gap-3 pt-4 border-t mt-2">
                <Button 
                  type="primary" 
                  icon={<CheckOutlined />} 
                  onClick={() => handleApprove(selectedRequest.id)} 
                  className="flex-1" 
                  style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
                  loading={updateStatusMutation.isPending}
                >
                  Approve Request
                </Button>
                <Button 
                  danger 
                  icon={<CloseOutlined />} 
                  onClick={() => handleReject(selectedRequest.id)} 
                  className="flex-1"
                  loading={updateStatusMutation.isPending}
                >
                  Reject Request
                </Button>
              </div>
            )}
            
            {selectedRequest.status !== "pending" && (
              <div className="flex gap-3 pt-4 border-t mt-2">
                <Button 
                  type="primary" 
                  onClick={() => { 
                    setViewModalVisible(false); 
                    setSelectedRequest(null); 
                  }} 
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
export default Request;