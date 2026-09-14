import type {AdminServices,Booking,Staff,User,} from "../api/generated";

export interface StaffFormValues {
  name: string;
  email: string;
  Password?: string;
  role: string;
  status: string;
}

export interface FieldErrors {
  name: string;
  email: string;
  password: string;
}

export interface StaffRow {
  key: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  joined: string;
  salonName: string;
}

export interface StaffListResult {
  data: StaffRow[];
  totalCount: number;
  hasNextPage: boolean;
  nextPage: number;
}

export interface StaffItem {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  Name?: string;
  FullName?: string;
  staffName?: string;
  email?: string;
  Email?: string;
  salonName?: string;
  SalonName?: string;
}

export interface ServiceRow {
  key: string;
  id?: string | null;
  serviceName: string;
  duration: number;
  price: number;
  status: "active" | "inactive";
  salonName: string;
}

export interface ServiceFormValues {
  serviceName: string;
  duration: number;
  price: number;
  status: "active" | "inactive";
  salonName?: string;
}

export interface ServiceItem {
  id?: string;
  _id?: string;
  name?: string;
  serviceName?: string;
  Name?: string;
  ServiceName?: string;
  duration?: number;
  Duration?: number;
  price?: number;
  Price?: number;
}

export interface DayTiming {
  day: string;
  opening: string;
  closing: string;
  isOpen: boolean;
}

export type TimingRecord = Record<string, DayTiming>;

export interface Slot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface SlotDto {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface ProfileFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface DashboardStaff extends Staff {
  key: string | number;
  status: "active" | "inactive";
}

export interface DashboardService extends AdminServices {
  key: string | number;
  name: string;
  duration: number;
  price: number;
  status: "active" | "inactive";
}

export interface DashboardBooking extends Booking {
  key: string | number;
  date: string | Date;
  amount: number;
  status: string;
  staffName?: string;
}

export interface DashboardCompany {
  id: string | number;
  salonName: string;
  owner: string;
  email: string;
  phone: string;
  status: string;
}

export interface UserResponse {
  status?: boolean;
  result?: {
    data?: User[] | null;
    totalCount?: number;
    hasNextPage?: boolean;
  };
}

export interface UserData {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  Email?: string;
  role?: string | number;
}

export interface UserRow extends User {
  key: string;
  phoneNumber?: string;
  salonName?: string;
}

export interface UserPage {
  data: UserRow[];
  totalCount: number;
  hasNextPage: boolean;
  nextPage: number;
}

export interface UserFormValues {
  fullName: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  salonName?: string;
  salonAddress?: string;
  role: number;
  isActive: string;
  staffId?: string;
}

export interface CompanyFormValues {
  salonName: string;
  companyName: string;
  owner: string;
  email: string;
  phone: string;
  salonAddress: string;
  password?: string;
  confirmPassword?: string;
  status?: "active" | "inactive";
}

export interface CompanyRow {
  key: string;
  id?: string;
  salonName: string;
  owner: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  salonAddress: string;
}

export interface CompanyListResult {
  data: CompanyRow[];
  totalCount: number;
  hasNextPage: boolean;
  nextPage: number;
}

export type Salon = User & {
  id: string;
  salonName: string;
};

export interface BookingItem {
  id?: string;
  _id?: string;
  customerId?: string;
  CustomerId?: string;
  customerName?: string;
  CustomerName?: string;
  customer?: {
    name?: string;
    Name?: string;
  };
  staffId?: string;
  StaffId?: string;
  serviceId?: string;
  ServiceId?: string;
  serviceIds?: string[];
  ServiceIds?: string[];
  serviceName?: string;
  ServiceName?: string;
  appointmentDate?: string;
  AppointmentDate?: string;
  startTime?: string;
  StartTime?: string;
  endTime?: string;
  EndTime?: string;
  amount?: number;
  Amount?: number;
  status?: string;
  Status?: string;
  salonName?: string;
  SalonName?: string;
}

export interface BookingResult {
  data?: BookingItem[];
  pagination?: {
    totalCount?: number;
    hasNextPage?: boolean;
  };
}

export interface BookingResponse {
  status?: boolean;
  result?: {
    data?: Booking[] | null;
    totalCount?: number;
    hasNextPage?: boolean;
  };
}

export interface BookingRow {
  key: string;
  id: string;
  customerName: string;
  customerId: string;
  staffName: string;
  staffId: string;
  serviceName: string;
  serviceId: string;
  appointmentDate: string;
  date: string;
  time: string;
  amount: number;
  status: string;
  salonName: string;
  originalData: Booking | BookingItem;
}

export interface BookingPage {
  data: BookingRow[];
  totalCount: number;
  hasNextPage: boolean;
  nextPage: number;
}

export interface ReferenceData {
  staffMap: Record<string, Staff>;
  serviceMap: Record<string, AdminServices>;
}

export interface CancellationReason {
  value: string;
  label: string;
}

export interface RequestRow {
  id: string;
  salonName: string;
  owner: string;
  email: string;
  requestDate: string;
  status: string;
}

export interface ApiResponse<T> {
  status?: boolean;
  result?: T;
}


export interface UserResult {
  data?: User[];
  pagination?: {
    totalCount?: number;
    hasNextPage?: boolean;
  };
}

