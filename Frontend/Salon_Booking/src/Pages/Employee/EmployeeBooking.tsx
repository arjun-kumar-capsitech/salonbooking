import { useMemo, useState, useEffect, useRef } from "react"; 
import { Card, Button, message, Spin } from "antd"; 
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons"; 
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"; 
import Modals from "../../Components/Ui/Modals"; 
import { DataTable, StatusBadge } from "../../Components/Ui/Table"; 
import SearchInput from "../../Components/Ui/SearchInput"; 
import dayjs from "dayjs"; 
import { getSalonBookingAPI } from "../../api/generated"; 
import { useSearch } from "../../utils/FilterData"; 
import type { BookingRow, UserData, StaffItem, ApiResponse, BookingResult, ServiceItem, BookingItem } from "../../Types/Alltypes"; 

const { getApiBooking, getApiStaff, getApiAdminServices, putApiBookingId } = getSalonBookingAPI(); 
const axiosConfig = { withCredentials: true }; 
 
const parseResponse = <T,>(data: unknown): T | null => { 
  if (!data) return null; 
  if (typeof data === "string") { 
    try { 
      return JSON.parse(data) as T; 
    } catch { 
      return null; 
    } 
  } 
  return data as T; 
}; 
 
const normalizeStatus = (value: unknown): string => { 
  const status = String(value ?? "pending").toLowerCase(); 
  return status === "complete" ? "completed" : status; 
}; 
 
const EmployeeBooking = () => { 
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null); 
  const [modalVisible, setModalVisible] = useState(false); 
  const [statusFilter, setStatusFilter] = useState("all"); 
  const observerRef = useRef<IntersectionObserver | null>(null); 
  const loadMoreRef = useRef<HTMLDivElement | null>(null); 
  const queryClient = useQueryClient(); 
 
  const user = useMemo<UserData>(() => { 
    const storedUser = localStorage.getItem("user"); 
    if (!storedUser) return {}; 
    try { 
      return JSON.parse(storedUser) as UserData; 
    } catch { 
      return {}; 
    } 
  }, []); 
 
  const loggedInUserEmail = String(user?.Email ?? user?.email ?? "").toLowerCase(); 
 
  const { data: staffList = [], isLoading: staffLoading } = useQuery<StaffItem[]>({ 
    queryKey: ["employee-booking-staff"], 
    queryFn: async () => { 
      const response = await getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig); 
      const data = parseResponse<ApiResponse<BookingResult>>(response.data); 
      return Array.isArray(data?.result?.data) ? data.result.data as unknown as StaffItem[] : []; 
    }, 
  }); 
 
  const currentStaff = useMemo(() => { 
    if (!loggedInUserEmail) return undefined; 
    return staffList.find((staff) => String(staff.email ?? staff.Email ?? "").toLowerCase() === loggedInUserEmail); 
  }, [staffList, loggedInUserEmail]); 
 
  const staffId = String(currentStaff?.id ?? currentStaff?._id ?? ""); 
 
  const staffMap = useMemo<Record<string, string>>(() => { 
    const map: Record<string, string> = {}; 
    staffList.forEach((staff) => { 
      const id = String(staff.id ?? staff._id ?? ""); 
      if (!id) return; 
      map[id] = staff.fullName ?? staff.FullName ?? staff.name ?? staff.Name ?? staff.staffName ?? "Unknown Staff"; 
    }); 
    return map; 
  }, [staffList]); 
 
  const { data: servicesData = [], isLoading: servicesLoading } = useQuery<ServiceItem[]>({ 
    queryKey: ["employee-booking-services"], 
    queryFn: async () => { 
      const response = await getApiAdminServices(axiosConfig); 
      const data = parseResponse<ApiResponse<ServiceItem[] | { data?: ServiceItem[] }>>(response.data); 
      const result = data?.result; 
      if (Array.isArray(result)) return result; 
      if (result && Array.isArray(result.data)) return result.data; 
      return []; 
    }, 
  }); 
 
  const serviceMap = useMemo<Record<string, string>>(() => { 
    const map: Record<string, string> = {}; 
    servicesData.forEach((service) => { 
      const id = String(service.id ?? service._id ?? ""); 
      if (!id) return; 
      map[id] = service.serviceName ?? service.ServiceName ?? service.name ?? service.Name ?? "Unknown"; 
    }); 
    return map; 
  }, [servicesData]); 
 
  const getServiceDisplay = (booking: BookingItem): string => { 
    const serviceIds = booking.serviceIds ?? booking.ServiceIds ?? []; 
    if (Array.isArray(serviceIds) && serviceIds.length > 0) { 
      return serviceIds.map((id) => serviceMap[String(id)] ?? "Unknown").join(", "); 
    } 
    const serviceId = String(booking.serviceId ?? booking.ServiceId ?? "");  
    if (serviceId && serviceMap[serviceId]) return serviceMap[serviceId]; 
    return booking.serviceName ?? booking.ServiceName ?? "Unknown"; 
  }; 
 
  const {  data: infiniteData,  fetchNextPage,  hasNextPage,  isFetchingNextPage,  isLoading: bookingsLoading,  isFetching, 
  } = useInfiniteQuery({ 
    queryKey: ["employee-booking-bookings", staffId], 
    enabled: Boolean(staffId), 
    initialPageParam: 1, 
    queryFn: async ({ pageParam }) => { 
      const response = await getApiBooking({ page: pageParam, pageSize: 5 }, axiosConfig); 
      const data = parseResponse<ApiResponse<BookingResult>>(response.data); 
 
      if (data?.status !== true || !Array.isArray(data.result?.data)) { 
        return { 
          data: [] as BookingRow[], 
          totalCount: 0, 
          hasNextPage: false, 
          nextPage: pageParam + 1, 
        }; 
      } 
 
      const bookings = data.result.data.filter( 
        (booking) => String(booking.staffId ?? booking.StaffId ?? "") === staffId 
      ); 
      const transformedBookings: BookingRow[] = bookings.map((booking, index) => { 
        const id = String(booking.id ?? booking._id ?? `${pageParam}-${index}`); 
        const bookingStaffId = String( 
          booking.staffId ?? booking.StaffId ?? "" 
        ); 
 
        const dateStr = 
          booking.appointmentDate ?? 
          booking.AppointmentDate ?? 
          ""; 
 
        const startTime = 
          booking.startTime ?? 
          booking.StartTime ?? 
          ""; 
 
        const endTime = 
          booking.endTime ?? 
          booking.EndTime ?? 
          ""; 
 
        let time = "N/A"; 
 
        if (startTime && endTime) { 
          time = `${startTime} - ${endTime}`; 
        } else if (startTime) { 
          time = startTime; 
        } else if (endTime) { 
          time = endTime; 
        } else if (dayjs(dateStr).isValid()) { 
          time = dayjs(dateStr).format("hh:mm A"); 
        } 
 
        return { 
          key: id, 
          id, 
 
          customerName: 
            booking.customerName ?? 
            booking.CustomerName ?? 
            booking.customer?.name ?? 
            booking.customer?.Name ?? 
            "Customer", 
 
          customerId: String( 
            booking.customerId ?? 
            booking.CustomerId ?? 
            "" 
          ), 
 
          staffName: 
            staffMap[bookingStaffId] ?? 
            "Staff", 
 
          staffId: bookingStaffId, 
 
          serviceName: getServiceDisplay(booking), 
 
          serviceId: String( 
            booking.serviceId ?? 
            booking.ServiceId ?? 
            "" 
          ), 
 
          appointmentDate: dateStr, 
 
          date: dayjs(dateStr).isValid() 
            ? dayjs(dateStr).format("DD MMM YYYY") 
            : "N/A", 
 
          time, 
 
          amount: Number( 
            booking.amount ?? 
            booking.Amount ?? 
            0 
          ), 
 
          status: normalizeStatus( 
            booking.status ?? 
            booking.Status 
          ), 
 
          salonName: 
            booking.salonName ?? 
            booking.SalonName ?? 
            "N/A", 
          originalData: booking, 
        }; 
      }); 
 
      return { 
        data: transformedBookings, 
        totalCount: data.result.pagination?.totalCount ?? transformedBookings.length, 
        hasNextPage: data.result.pagination?.hasNextPage ?? false, 
        nextPage: pageParam + 1, 
      }; 
    }, 
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined, 
  }); 
 
  useEffect(() => { 
    if (!hasNextPage || isFetchingNextPage) return; 
 
    observerRef.current?.disconnect(); 
 
    observerRef.current = new IntersectionObserver((entries) => { 
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); 
    }, { threshold: 0.1 }); 
 
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current); 
 
    return () => { 
      observerRef.current?.disconnect(); 
      observerRef.current = null; 
    }; 
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]); 
 
  const allBookings = useMemo( 
    () => infiniteData?.pages.flatMap((page) => page.data) ?? [], 
    [infiniteData] 
  ); 
 
  const { searchText, setSearchText, filteredData } = useSearch( 
    allBookings, 
    ["customerName", "serviceName"], 
    500 
  ); 
 
  const filteredBookings = useMemo(() => { 
    if (statusFilter === "all") return filteredData ?? []; 
    return (filteredData ?? []).filter((booking) => booking.status === statusFilter); 
  }, [filteredData, statusFilter]); 
 
  const updateStatusMutation = useMutation({ 
    mutationFn: async ({ id, status }: { id: string; status: string }) => { 
      await putApiBookingId(id, { status }, axiosConfig); 
    }, 
    onSuccess: (_, variables) => { 
      message.success(`Booking ${variables.status} successfully!`); 
      queryClient.invalidateQueries({ queryKey: ["employee-booking-bookings"] }); 
      handleCloseModal(); 
    }, 
    onError: () => { 
      message.error("Failed to update booking"); 
    }, 
  }); 
 
  const handleUpdateStatus = (status: string) => { 
    if (!selectedBooking?.id || updateStatusMutation.isPending) return; 
    updateStatusMutation.mutate({ id: selectedBooking.id, status }); 
  }; 
 
  const handleViewBooking = (record: BookingRow) => { 
    setSelectedBooking(record); 
    setModalVisible(true); 
  }; 
 
  const handleCloseModal = () => { 
    setModalVisible(false); 
    setSelectedBooking(null); 
  }; 
 
  const columns = [ 
    { 
      title: "Customer", 
      dataIndex: "customerName", 
      render: (text: string) => <div className="font-medium text-gray-800">{text || "N/A"}</div>, 
    }, 
    { 
      title: "Date & Time", 
      render: (_: unknown, record: BookingRow) => ( 
        <div> 
          <div className="font-medium">{record.date}</div> 
          <div className="text-xs text-gray-500">{record.time}</div> 
        </div> 
      ), 
    }, 
    { 
      title: "Service", 
      dataIndex: "serviceName", 
      render: (text: string) => text || "N/A", 
    }, 
    { 
      title: "Amount", 
      dataIndex: "amount", 
      render: (value: number) => `$${Number(value || 0).toFixed(2)}`, 
    }, 
    { 
      title: "Status", 
      render: (_: unknown, record: BookingRow) => ( 
        <StatusBadge type="booking" value={record.status || "pending"} /> 
      ), 
    }, 
  ]; 
 
  const isLoading = (bookingsLoading && !infiniteData) || staffLoading || servicesLoading; 
 
  if (!loggedInUserEmail) { 
    return ( 
      <div className="p-6 text-center"> 
        <Card>Please login to view bookings</Card> 
      </div> 
    ); 
  } 
 
  if (!currentStaff && !staffLoading) { 
    return ( 
      <div className="p-6 text-center"> 
        <Card>No staff record found for this account</Card> 
      </div> 
    ); 
  } 
 
  return ( 
    <div className="p-6"> 
      <div className="mb-6"> 
        <h1 className="text-2xl font-bold" style={{ fontFamily: "PT Serif, serif" }}> 
          My Assigned Bookings 
        </h1> 
        <p className="text-gray-600" style={{ fontFamily: "Public Sans, sans-serif" }}> 
          View and manage your assigned appointments 
        </p> 
      </div> 
 
      <Card className="mb-6"> 
        <SearchInput 
          searchText={searchText} 
          onSearchChange={setSearchText} 
          status={statusFilter} 
          onStatusChange={setStatusFilter} 
          statusOptions={[ 
            { value: "all", label: "All Status" }, 
            { value: "pending", label: "Pending" }, 
            { value: "confirmed", label: "Confirmed" }, 
            { value: "completed", label: "Completed" }, 
            { value: "cancelled", label: "Cancelled" }, 
          ]} 
          placeholder="Search by customer or service..." 
          width={300} 
        /> 
      </Card> 
 
      <Card> 
        <div className="mb-4 flex justify-between items-center"> 
          <div className="p-2 font-medium"> 
            My Bookings 
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />} 
          </div> 
        </div> 
 
        <DataTable 
          data={filteredBookings} 
          columns={columns} 
          loading={isLoading} 
          onView={handleViewBooking} 
          showActions 
          rowKey="key" 
          tableType="bookings" 
        /> 
 
        <div ref={loadMoreRef} className="py-4"> 
          {isFetchingNextPage && ( 
            <div className="text-center py-4"> 
              <Spin size="large" /> 
              <p className="mt-2 text-gray-500">Loading more bookings...</p> 
            </div> 
          )} 
 
          {!hasNextPage && filteredBookings.length === 0 && !isLoading && ( 
            <div className="text-center py-8 text-gray-500">No bookings found</div> 
          )} 
 
          {!hasNextPage && filteredBookings.length > 0 && !isFetchingNextPage && ( 
            <div className="text-center py-4 text-sm text-gray-500">All bookings loaded</div> 
          )} 
        </div> 
      </Card> 
 
      <Modals 
        open={modalVisible} 
        onClose={handleCloseModal} 
        title="Booking Details" 
        onSubmit={handleCloseModal} 
        submitText="Close" 
        width={500} 
      > 
        {selectedBooking && ( 
          <div className="space-y-4"> 
            <div> 
              <p className="text-sm text-gray-500">Customer</p> 
              <p className="font-semibold text-lg">{selectedBooking.customerName}</p> 
            </div> 
 
            <div> 
              <p className="text-sm text-gray-500">Staff</p> 
              <p className="font-medium">{selectedBooking.staffName}</p> 
            </div> 
 
            <div> 
              <p className="text-sm text-gray-500">Service</p> 
              <p className="font-medium">{selectedBooking.serviceName}</p> 
            </div> 
 
            <div> 
              <p className="text-sm text-gray-500">Salon</p> 
              <p className="font-medium">{selectedBooking.salonName}</p> 
            </div> 
 
            <div> 
              <p className="text-sm text-gray-500">Date & Time</p> 
              <p className="font-medium"> 
                {selectedBooking.date} at {selectedBooking.time} 
              </p> 
            </div> 
 
            <div> 
              <p className="text-sm text-gray-500">Amount</p> 
              <p className="font-medium text-lg text-green-600"> 
                ${Number(selectedBooking.amount || 0).toFixed(2)} 
              </p> 
            </div> 
 
            <div> 
              <p className="text-sm text-gray-500">Status</p> 
              <StatusBadge type="booking" value={selectedBooking.status || "pending"} /> 
            </div> 
 
            {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && ( 
              <div className="flex gap-3 flex-wrap pt-3"> 
                <Button 
                  type="primary" 
                  icon={<CheckCircleOutlined />} 
                  onClick={() => handleUpdateStatus("confirmed")} 
                  loading={updateStatusMutation.isPending} 
                  disabled={selectedBooking.status === "confirmed"} 
                > 
                  Confirm 
                </Button> 
 
                <Button 
                  type="primary" 
                  icon={<CheckCircleOutlined />} 
                  onClick={() => handleUpdateStatus("completed")} 
                  loading={updateStatusMutation.isPending} 
                > 
                  Complete 
                </Button> 
 
                <Button 
                  danger 
                  icon={<CloseCircleOutlined />} 
                  onClick={() => handleUpdateStatus("cancelled")} 
                  loading={updateStatusMutation.isPending} 
                > 
                  Cancel 
                </Button> 
              </div> 
            )} 
          </div> 
        )} 
      </Modals> 
    </div> 
  ); 
}; 

export default EmployeeBooking;