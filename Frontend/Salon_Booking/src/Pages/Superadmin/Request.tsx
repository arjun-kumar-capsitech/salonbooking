import { useEffect, useState } from "react";
import { Button, Input, message, Modal } from "antd";
import {SearchOutlined, CheckOutlined,CloseOutlined,ShopOutlined,} from "@ant-design/icons";
import axios from "axios";
import { DataTable } from "../../Components/Ui/Table";

interface SalonRequest {
  id: string;
  salonName: string;
  ownerName: string;
  phone: string;
  email: string;
  requestDate: string;
  status: string;
}

const API_URL = "http://localhost:5296/api/User";

const Request = () => {
  const [searchText, setSearchText] = useState("");
  const [requests, setRequests] = useState<SalonRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<SalonRequest | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);

      const savedStatus = JSON.parse(
        localStorage.getItem("salonStatus") || "{}"
      );

      const formatted = res.data
        .filter((u: any) => u.role === 2)
        .map((u: any) => ({
          id: u.id,
          salonName: u.salonName,
          ownerName: u.fullName,
          phone: u.phoneNumber,
          email: u.email,
          requestDate: new Date().toLocaleDateString(),
          status: savedStatus[u.id] || "pending", 
        }));

      setRequests(formatted);
    } catch {
      message.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter(
    (r) =>
      r.salonName?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.ownerName?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleApprove = (id: string) => {
    const updated = requests.map((r) =>
      r.id === id ? { ...r, status: "approved" } : r
    );

    setRequests(updated);

    const saved = JSON.parse(localStorage.getItem("salonStatus") || "{}");
    saved[id] = "approved";
    localStorage.setItem("salonStatus", JSON.stringify(saved));

    message.success("Salon Approved");
  };

  const handleReject = (id: string) => {
    const updated = requests.map((r) =>
      r.id === id ? { ...r, status: "rejected" } : r
    );

    setRequests(updated);

    const saved = JSON.parse(localStorage.getItem("salonStatus") || "{}");
    saved[id] = "rejected";
    localStorage.setItem("salonStatus", JSON.stringify(saved));

    message.success("Salon Rejected");
  };

  const columns = [
    {
      title: "Salon Name",
      dataIndex: "salonName",
    },
    {
      title: "Owner Name",
      dataIndex: "ownerName",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${status === "pending"
              ? "bg-orange-100 text-orange-800"
              : status === "approved"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl mb-4 font-bold">
            Salon Registration Requests
          </h1>
          <p className="text-gray-600">
            Approve or reject salon registration requests
          </p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search salon..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-64"
          />
        </div>

        <DataTable
          data={filteredRequests}
          columns={columns}
          loading={loading}
          rowKey="id"
          showActions={true}
          onView={(record) => {
            setSelectedRequest(record);
            setViewModalVisible(true);
          }}
        />

        <Modal
          title="Salon Details"
          open={viewModalVisible}
          onCancel={() => {
            setViewModalVisible(false);
            setSelectedRequest(null);
          }}
          footer={null}
          centered
        >
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <ShopOutlined className="text-blue-600 text-xl" />
                </div>

                <div>
                  <h3 className="text-lg font-bold">
                    {selectedRequest.salonName}
                  </h3>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Owner</div>
                <div className="font-medium">
                  {selectedRequest.ownerName}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="font-medium">{selectedRequest.phone}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div>{selectedRequest.email}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Request Date</div>
                <div>{selectedRequest.requestDate}</div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    handleApprove(selectedRequest.id);
                    setViewModalVisible(false);
                  }}
                  className="flex-1"
                >
                  Approve
                </Button>

                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    handleReject(selectedRequest.id);
                    setViewModalVisible(false);
                  }}
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

export default Request;