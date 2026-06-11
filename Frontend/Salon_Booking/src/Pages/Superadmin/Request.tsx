// SuperAdmin/Request.jsx
import { useState,useMemo } from "react";
import { Button, Input, message, Modal, Card } from "antd";
import { SearchOutlined, CheckOutlined, CloseOutlined, ShopOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuperAdminRequest } from "../../Redux/Store/Slice/columnsSlice";
import { DataTable } from "../../Components/Ui/Table";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiUser } = getSalonBookingAPI();

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

  const extractData = (response: any) => {
    if (!response || !response.data) return [];
    if (response.data?.status === true && response.data?.result) return response.data.result;
    if (response.data?.result) return response.data.result;
    if (Array.isArray(response.data)) return response.data;
    return [];
  };

  dispatch(showSuperAdminRequest());

  const { data: requests = [], isLoading,} = useQuery({
    queryKey: ['salonRequests'],
    enabled: !!token,  staleTime: 5000,  refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiUser(axiosConfig);
      const usersData = extractData(res);
      const savedStatus = JSON.parse(localStorage.getItem("salonStatus") || "{}");
      return usersData.filter((u: any) => u.role === 2).map((u: any) => ({
        id: u.id || u._id,
        companyName: u.salonName || u.SalonName,
        owner: u.fullName || u.FullName,
        email: u.email || u.Email,
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
    }
  });

  const handleApprove = (id: string) => updateStatusMutation.mutate({ id, status: "approved" });
  const handleReject = (id: string) => updateStatusMutation.mutate({ id, status: "rejected" });
  const filteredRequests = useMemo(() => {
    return requests.filter((r: any) =>
      r.companyName?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.owner?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [requests, searchText]);
  const columns = [
    {
      title: "Company Name",
      dataIndex: "companyName",
      render: (text: string, record: any) => (<div><div className="font-medium">{text}</div><div className="text-gray-500 text-sm">Owner: {record.owner}</div></div>),
    },
    { title: "Email", dataIndex: "email" },
    { title: "Request Date", dataIndex: "requestDate", render: (date: string) => new Date(date).toLocaleDateString() },
    { title: "Status", dataIndex: "status", render: (status: string) => <StatusBadge status={status} /> },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold">Salon Requests</h1><p className="text-gray-600">Manage salon registration requests</p></div>
      </div>

      <Card className="mb-6">
        <Input placeholder="Search by company or owner name" prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 350 }} />
      </Card>

      <Card>
        <p className="p-2 font-medium">All Request Data ({requests.length})</p>
        <DataTable data={filteredRequests} columns={columns} loading={isLoading} rowKey="id" showActions={true} onView={(record) => { setSelectedRequest(record); setViewModalVisible(true); }} />
      </Card>

      <Modal title="Request Details" open={viewModalVisible} onCancel={() => { setViewModalVisible(false); setSelectedRequest(null); }} footer={null} centered width={500}>
        {selectedRequest && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 pb-3 border-b">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"><ShopOutlined className="text-blue-600 text-xl" /></div>
              <div><h3 className="text-lg font-bold">{selectedRequest.companyName}</h3><p className="text-gray-500 text-sm">Salon Registration Request</p></div>
            </div>
            <div><div className="text-sm text-gray-500 mb-1">Owner Name</div><div className="font-medium text-base">{selectedRequest.owner}</div></div>
            <div><div className="text-sm text-gray-500 mb-1">Email Address</div><div className="text-base">{selectedRequest.email}</div></div>
            <div><div className="text-sm text-gray-500 mb-1">Request Date</div><div className="text-base">{new Date(selectedRequest.requestDate).toLocaleDateString()}</div></div>
            <div><div className="text-sm text-gray-500 mb-1">Current Status</div><StatusBadge status={selectedRequest.status} /></div>
            <div className="flex gap-3 pt-4 border-t mt-2">
              <Button type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(selectedRequest.id)} className="flex-1" style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}>Approve Request</Button>
              <Button danger icon={<CloseOutlined />} onClick={() => handleReject(selectedRequest.id)} className="flex-1">Reject Request</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default Request;