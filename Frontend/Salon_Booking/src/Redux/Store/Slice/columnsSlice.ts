import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ColumnsState {
  currentColumns: string[];
  currentData: any[];

  adminServices: string[];
  adminBookings: string[];
  adminStaff: string[];
  adminUser: string[];
  customerBookings: string[];
  employeeService: string[];
  employeeBooking: string[];
  superAdminCompani: string[];
  superAdminRequest: string[];
  superAdminUser: string[];
}

const initialState: ColumnsState = {
  currentColumns: [],
  currentData: [],

  // ✅ FIXED - Added "Salon Name" for Admin/SuperAdmin
  adminServices: [
    "Service Name",
    "Salon Name",    // ✅ Added
    "Duration",
    "Price", 
    "Status",
    "Actions",
  ],

  adminBookings: [
    "Customer",
    "Service",
    "Staff",
    "Appointment",
    "Amount",
    "Status",
    "Actions",
  ],

  adminStaff: [
    "Staff Name",
    "Email",
    "Joining Date",
    "Role",
    "Status",
    "Actions",
  ],

  adminUser: [
    "User Name",
    "Email",
    "Phone",
    "Role",
    "Status",
    "Actions",
  ],

  customerBookings: [
    "Service",
    "Staff",
    "Date",
    "Time",
    "Amount",
    "Status",
    "Actions",
  ],

  employeeService: [
    "Service Name",
    "Duration",
    "Price",
    "Actions",
  ],

  employeeBooking: [
    "Customer",
    "Service",
    "Time",
    "Status",
    "Actions",
  ],

  superAdminCompani: [
    "Company Name",
    "Owner",
    "Email",
    "Phone",
    "Status",
    "Actions",
  ],

  superAdminRequest: [
    "Company Name",
    "Owner",
    "Email",
    "Request Date",
    "Status",
    "Actions",
  ],

  superAdminUser: [
    "User Name",
    "Email",
    "Phone",
    "Role",
    "Company",
    "Status",
    "Actions",
  ],
};

const columnsSlice = createSlice({
  name: "columns",
  initialState,

  reducers: {
    setCurrentColumns: (
      state,
      action: PayloadAction<string[]>
    ) => {
      state.currentColumns = action.payload;
    },

    setCurrentData: (
      state,
      action: PayloadAction<any[]>
    ) => {
      state.currentData = action.payload;
    },

    showAdminServices: (state) => {
      state.currentColumns = state.adminServices;
    },

    showAdminBookings: (state) => {
      state.currentColumns = state.adminBookings;
    },

    showAdminStaff: (state) => {
      state.currentColumns = state.adminStaff;
    },

    showAdminUser: (state) => {
      state.currentColumns = state.adminUser;
    },

    showCustomerBookings: (state) => {
      state.currentColumns = state.customerBookings;
    },

    showEmployeeService: (state) => {
      state.currentColumns = state.employeeService;
    },

    showEmployeeBooking: (state) => {
      state.currentColumns = state.employeeBooking;
    },

    showSuperAdminCompani: (state) => {
      state.currentColumns = state.superAdminCompani;
    },

    showSuperAdminRequest: (state) => {
      state.currentColumns = state.superAdminRequest;
    },

    showSuperAdminUser: (state) => {
      state.currentColumns = state.superAdminUser;
    },
  },
});

export const {
  setCurrentColumns,
  setCurrentData,

  showAdminServices,
  showAdminBookings,
  showAdminStaff,
  showAdminUser,

  showCustomerBookings,

  showEmployeeService,
  showEmployeeBooking,

  showSuperAdminCompani,
  showSuperAdminRequest,
  showSuperAdminUser,
} = columnsSlice.actions;

export default columnsSlice.reducer;