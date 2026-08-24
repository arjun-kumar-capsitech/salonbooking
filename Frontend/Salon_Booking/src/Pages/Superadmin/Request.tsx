import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, Spin, message } from "antd";
import { CheckOutlined, CloseOutlined, ShopOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showSuperAdminRequest } from "../../Redux/Store/Slice/columnsSlice";
import { DataTable } from "../../Components/Ui/Table";
import SearchInput from "../../Components/Ui/SearchInput";
import { getSalonBookingAPI, type User } from "../../api/generated";
import { useSearch } from "../../utils/FilterData";
import type { ApiResponse, RequestRow, UserResult } from "../../Types/Alltypes";

const api = getSalonBookingAPI();
const apiOptions = { withCredentials: true };

const parseResponse = <T,>(data: unknown): T | null => {
  if (typeof data !== "string") return data as T;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

const getUsersFromResponse = (data: unknown): User[] => {
  const response = parseResponse<ApiResponse<UserResult> | ApiResponse<User[]> | User[]>(data);
  if (Array.isArray(response)) return response;
  if (!response?.result) return [];
  if (Array.isArray(response.result)) return response.result;
  return response.result.data ?? [];
};

const getApprovalStatus = (value: unknown): string => {
  if (typeof value === "number") {
    if (value === 1) return "approved";
    if (value === 2) return "rejected";
    return "pending";
  }
  const status = String(value ?? "pending").toLowerCase();
  if (status === "approve" || status === "approved") return "approved";
  if (status === "reject" || status === "rejected") return "rejected";
  return "pending";
};

const Request = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null);
  useEffect(() => {
    dispatch(showSuperAdminRequest());
  }, [dispatch]);

  const { data: requests = [], isLoading, isFetching } = useQuery<RequestRow[]>({
    queryKey: ["salonRequests"],
    queryFn: async () => {
      const response = await api.getApiUser(
        { page: 1, pageSize: 100 },
        apiOptions
      );
      const users = getUsersFromResponse(response.data);
      return users
        .filter((user) => {
          const role = user.role;
          return role === 2 || String(role).toLowerCase() === "admin";
        })
        .map((user): RequestRow => ({
          id: String(user.id ?? ""),
          salonName: String(user.salonName ?? user.fullName ?? user.name ?? "N/A"),
          owner: String(user.fullName ?? user.name ?? "N/A"),
          email: String(user.email ?? "N/A"),
          requestDate: String(user.createdAt ?? ""),
          status: getApprovalStatus(user.approvalStatus),
        }));
    },
    staleTime: 30000,
  });

  const { searchText, setSearchText, filteredData } = useSearch<RequestRow>(
    requests,
    ["salonName", "owner", "email"],
    500
  );

  const filteredRequests = useMemo(
    () => filteredData ?? [],
    [filteredData]
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      status,
    }: {
      id: string;
      status: "approved" | "rejected";
    }) => {
      throw new Error(
        `Orval endpoint for ${status} is not available in generated.ts`
      );
    },
    onSuccess: () => {
      message.success("Request updated successfully");
      void queryClient.invalidateQueries({
        queryKey: ["salonRequests"],
      });
      setViewModalVisible(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      message.error(error.message || "Failed to update request");
    },
  });

  const handleApprove = () => {
    if (!selectedRequest?.id) return;
    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status: "approved",
    });
  };

  const handleReject = () => {
    if (!selectedRequest?.id) return;
    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status: "rejected",
    });
  };

  const closeModal = () => {
    setViewModalVisible(false);
    setSelectedRequest(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "PT Serif, serif" }}
        >
          Salon Requests
        </h1>
        <p
          className="text-gray-600"
          style={{ fontFamily: "Public Sans, sans-serif" }}
        >
          Manage salon registration requests
        </p>
        {requests.length > 0 && (
          <p className="mt-1 text-sm text-gray-500">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        )}
      </div>

      <Card className="mb-6">
        <SearchInput
          searchText={searchText}
          onSearchChange={setSearchText}
          placeholder="Search company, owner or email..."
          width={400}
        />
      </Card>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 p-2 font-medium">
            <span>All Request Data</span>
            {isFetching && !isLoading && <Spin size="small" />}
          </div>
        </div>
        <DataTable
          data={filteredRequests}
          tableType="requests"
          loading={isLoading}
          rowKey="id"
          showActions
          onView={(record: RequestRow) => {
            setSelectedRequest(record);
            setViewModalVisible(true);
          }}
        />
        {!isLoading && filteredRequests.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No salon requests found
          </div>
        )}
      </Card>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ShopOutlined />
            <span>Request Details</span>
          </div>
        }
        open={viewModalVisible}
        onCancel={closeModal}
        footer={null}
        centered
        width={520}
        destroyOnHidden
      >
        {selectedRequest && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <ShopOutlined className="text-xl text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {selectedRequest.salonName}
                </h3>
                <p className="text-sm text-gray-500">
                  Salon Registration Request
                </p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-500">Owner Name</p>
              <p className="font-medium">{selectedRequest.owner}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-500">Email Address</p>
              <p>{selectedRequest.email}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-500">Request Date</p>
              <p>
                {selectedRequest.requestDate
                  ? new Date(selectedRequest.requestDate).toLocaleString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-500">Current Status</p>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  selectedRequest.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : selectedRequest.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {selectedRequest.status.toUpperCase()}
              </span>
            </div>
            {selectedRequest.status === "pending" ? (
              <div className="flex gap-3 border-t pt-4">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleApprove}
                  loading={updateStatusMutation.isPending}
                  className="flex-1"
                >
                  Approve Request
                </Button>

                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={handleReject}
                  loading={updateStatusMutation.isPending}
                  className="flex-1"
                >
                  Reject Request
                </Button>
              </div>
            ) : (
              <div className="border-t pt-4">
                <Button
                  type="primary"
                  onClick={closeModal}
                  className="w-full"
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