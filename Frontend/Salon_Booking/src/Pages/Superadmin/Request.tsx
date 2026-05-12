import { useEffect, useState } from "react";
import {Button,Input,message,Modal,Card} from "antd";
import {SearchOutlined,CheckOutlined,CloseOutlined,ShopOutlined,} from "@ant-design/icons";
import axios from "axios";
import { useDispatch } from "react-redux";
import {showSuperAdminRequest,} from "../../Redux/Store/Slice/columnsSlice";
import { DataTable,StatusBadge} from "../../Components/Ui/Table";

interface SalonRequest {
  id: string;
  companyName: string;
  owner: string;
  email: string;
  requestDate: string;
  status: string;
}

const API_URL = "http://localhost:5296/api/User";
const Request = () => {
  const dispatch = useDispatch();
  const [searchText, setSearchText] = useState("");
  const [requests, setRequests] = useState<
    SalonRequest[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [viewModalVisible, setViewModalVisible] =
    useState(false);

  const [selectedRequest, setSelectedRequest] =
    useState<SalonRequest | null>(null);

  useEffect(() => {
    dispatch(showSuperAdminRequest());
  }, [dispatch]);

  const loadRequests = async () => {
    setLoading(true);

    try {
      const res = await axios.get(API_URL);

      const savedStatus = JSON.parse(
        localStorage.getItem("salonStatus") ||
          "{}"
      );

      const formatted = res.data
        .filter((u: any) => u.role === 2)
        .map((u: any) => ({
          id: u.id,
          companyName: u.salonName,
          owner: u.fullName,
          email: u.email,
          requestDate:
            u.createdAt ||
            new Date().toISOString(),
          status:
            savedStatus[u.id] || "pending",
        }));

      setRequests(formatted);
    } catch {
      message.error(
        "Failed to load requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter(
    (r) =>
      r.companyName
        ?.toLowerCase()
        .includes(searchText.toLowerCase()) ||
      r.owner
        ?.toLowerCase()
        .includes(searchText.toLowerCase())
  );

  const handleApprove = (id: string) => {
    const updated = requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "approved",
          }
        : r
    );

    setRequests(updated);

    const saved = JSON.parse(
      localStorage.getItem("salonStatus") ||
        "{}"
    );

    saved[id] = "approved";

    localStorage.setItem(
      "salonStatus",
      JSON.stringify(saved)
    );

    message.success("Request Approved");
  };

  const handleReject = (id: string) => {
    const updated = requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "rejected",
          }
        : r
    );

    setRequests(updated);

    const saved = JSON.parse(
      localStorage.getItem("salonStatus") ||
        "{}"
    );

    saved[id] = "rejected";

    localStorage.setItem(
      "salonStatus",
      JSON.stringify(saved)
    );

    message.success("Request Rejected");
  };

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Salon Requests
            </h1>
            <p className="text-gray-600">
              Manage salon registration requests
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <Input
            placeholder="Search requests"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) =>
              setSearchText(e.target.value)
            }
            style={{ width: 300 }}
          />
        </Card>

        <Card>
          <p className="p-2">
            All Request Data
          </p>
          <DataTable
            data={filteredRequests}
            tableType="requests"
            loading={loading}
            rowKey="id"
            showActions={true}
            onView={(record) => {
              setSelectedRequest(record);
              setViewModalVisible(true);
            }}
          />
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
        >
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <ShopOutlined className="text-blue-600 text-xl" />
                </div>

                <div>
                  <h3 className="text-lg font-bold">
                    {
                      selectedRequest.companyName
                    }
                  </h3>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Owner
                </div>

                <div className="font-medium">
                  {selectedRequest.owner}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Email
                </div>

                <div>
                  {selectedRequest.email}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Request Date
                </div>

                <div>
                  {
                    selectedRequest.requestDate
                  }
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-1">
                  Status
                </div>

                <StatusBadge
                  type="booking"
                  value={
                    selectedRequest.status
                  }
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    handleApprove(
                      selectedRequest.id
                    );

                    setViewModalVisible(
                      false
                    );
                  }}
                  className="flex-1"
                >
                  Approve
                </Button>

                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    handleReject(
                      selectedRequest.id
                    );

                    setViewModalVisible(
                      false
                    );
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