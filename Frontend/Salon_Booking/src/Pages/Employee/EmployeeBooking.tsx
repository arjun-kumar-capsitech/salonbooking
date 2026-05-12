import React, { useEffect, useState } from "react";
import { Card, Button, Input, message } from "antd";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import axios from "axios";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentColumns, setCurrentData,} from "../../Redux/Store/Slice/columnsSlice";

const BOOKING_API = "http://localhost:5296/api/Booking";
const USER_API = "http://localhost:5296/api/User";
const STAFF_API = "http://localhost:5296/api/Staff";
const SERVICE_API = "http://localhost:5296/api/AdminServices";
const EmployeeBooking: React.FC = () => {
const dispatch = useDispatch();
  const currentColumns = useSelector(
    (state: any) => state.columns.currentColumns
  );
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("authToken");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  useEffect(() => {
    dispatch(
      setCurrentColumns([
        "Customer",
        "Date & Time",
        "Services",
        "Amount",
        "Status",
        "Actions",
      ])
    );
  }, [dispatch]);

  const fetchBookings = async () => {
    setLoading(true);

    try {
      const [bookingRes, userRes, staffRes, serviceRes] =
        await Promise.all([
          axios.get(BOOKING_API, axiosConfig),
          axios.get(USER_API, axiosConfig),
          axios.get(STAFF_API, axiosConfig),
          axios.get(SERVICE_API, axiosConfig),
        ]);
      const users = userRes.data || [];
      const staff = staffRes.data || [];
      const services = serviceRes.data || [];
      const mapped = bookingRes.data.map(
        (b: any, index: number) => {
          const customer = users.find(
            (u: any) =>
              String(u.id || u._id) ===
              String(b.customerId)
          );

          const staffMember = staff.find(
            (s: any) =>
              String(s.id || s._id) ===
              String(b.staffId)
          );

          const service = services.find(
            (s: any) =>
              String(s.id || s._id) ===
              String(b.serviceId)
          );

          return {
            key: b.id || index,
            id: b.id || b._id,
            customerName:
              customer?.fullName || "N/A",
            date: dayjs(
              b.appointmentDate
            ).format("DD MMM YYYY"),
            time: dayjs(
              b.appointmentDate
            ).format("hh:mm A"),
            services:
              service?.serviceName || "N/A",
            employee:
              staffMember?.name || "N/A",
            status:
              b.status?.toLowerCase() ||
              "pending",
            amount: `$${b.amount || 0}`,
          };
        }
      );

      setBookings(mapped);
      dispatch(setCurrentData(mapped));

    } catch (err) {
      console.log(err);
      message.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter(
    (b) =>
      b.customerName
        ?.toLowerCase()
        .includes(searchText.toLowerCase()) ||
      String(b.id)
        .toLowerCase()
        .includes(searchText.toLowerCase())
  );

  const handleView = (record: any) => {
    setSelectedBooking(record);
    setModalVisible(true);
  };

  const handleStatusUpdate = async (
    newStatus: string
  ) => {
    try {
      await axios.put(
        `${BOOKING_API}/${selectedBooking.id}`,
        {
          status: newStatus,
        },
        axiosConfig
      );
      message.success("Booking updated");
      fetchBookings();
      setModalVisible(false);
      setSelectedBooking(null);
    } catch {
      message.error("Failed to update booking");
    }
  };

  const columns = [
    {
      title: currentColumns[0],
      dataIndex: "customerName",
      render: (text: string) => (
        <div className="py-1">
          <div className="font-medium text-gray-800">
            {text}
          </div>
          <div className="text-xs text-gray-500">
            Customer
          </div>
        </div>
      ),
    },

    {
      title: currentColumns[1],
      render: (_: any, record: any) => (
        <div className="py-1">
          <div className="font-medium text-gray-800">
            {record.time}
          </div>
          <div className="text-xs text-gray-500">
            {record.date}
          </div>
        </div>
      ),
    },

    {
      title: currentColumns[2],
      dataIndex: "services",
      render: (text: string) => (
        <div className="font-medium text-gray-800">
          {text}
        </div>
      ),
    },

    {
      title: currentColumns[3],
      dataIndex: "amount",
      render: (text: string) => (
        <div className="font-medium text-gray-800">
          {text}
        </div>
      ),
    },

    {
      title: currentColumns[4],
      render: (_: any, record: any) => (
        <StatusBadge
          type="booking"
          value={record.status}
        />
      ),
    },
  ];

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Booking Management
          </h1>
          <p className="text-gray-500">
            Your assigned bookings
          </p>
        </div>
        <Card className="shadow-sm border border-gray-100 rounded-xl">
          <div className="mb-4">
            <Input
              placeholder="Search bookings..."
              value={searchText}
              onChange={(e) =>
                setSearchText(e.target.value)
              }
              className="w-64"
            />
          </div>
          <DataTable
            data={filteredBookings}
            columns={columns}
            loading={loading}
            onView={handleView}
            showActions={true}
            rowKey="id"
          />
        </Card>

        <Modals
          onSubmit={() => {}}
          open={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedBooking(null);
          }}
          title={`Booking Details - ${selectedBooking?.customerName}`}
          width={500}
        >
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">
                  Customer
                </p>
                <p className="font-medium">
                  {selectedBooking.customerName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  Service
                </p>
                <p className="font-medium">
                  {selectedBooking.services}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  Date
                </p>

                <p className="font-medium">
                  {selectedBooking.date}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Time
                </p>

                <p className="font-medium">
                  {selectedBooking.time}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  Amount
                </p>
                <p className="font-medium">
                  {selectedBooking.amount}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Status
                </p>
                <StatusBadge
                  type="booking"
                  value={selectedBooking.status}
                />
              </div>

              {selectedBooking.status !==
                "completed" && (
                <div className="flex gap-3 pt-3">
                  <Button
                    type="primary"
                    onClick={() =>
                      handleStatusUpdate(
                        "confirmed"
                      )
                    }
                  >
                    Confirm
                  </Button>

                  <Button
                    onClick={() =>
                      handleStatusUpdate(
                        "pending"
                      )
                    }
                  >
                    Pending
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modals>
      </div>
    </>
  );
};

export default EmployeeBooking;