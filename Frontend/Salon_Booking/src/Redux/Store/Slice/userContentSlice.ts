import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  customer: {
    canAccessAppointment: false,
    canAccessBooking: false,
  },

  admin: {
    canAccessDashboard: false,
    canAccessBooking: false,
    canAccessServices: false,
    canAccessStaff: false,
    canAccessSetting: false,
    canAccessUser: false,
  },

  employee: {
    canAccessDeshbord: false,
    canAccessService: false,
    canAccessBooking: false,
  },

  superAdmin: {
    canAccessDeshboard: false,
    canAccessCompani: false,
    canAccessRequest: false,
    canAccessUser: false,
  },
};

const userContentSlice = createSlice({
  name: "userContent",

  initialState,

  reducers: {
    setPermissionsByRole: (state, action) => {
      const { role } = action.payload;

      state.customer = {
        canAccessAppointment: false,
        canAccessBooking: false,
      };

      state.admin = {
        canAccessDashboard: false,
        canAccessBooking: false,
        canAccessServices: false,
        canAccessStaff: false,
        canAccessSetting: false,
        canAccessUser: false,
      };

      state.employee = {
        canAccessDeshbord: false,
        canAccessService: false,
        canAccessBooking: false,
      };

      state.superAdmin = {
        canAccessDeshboard: false,
        canAccessCompani: false,
        canAccessRequest: false,
        canAccessUser: false,
      };

      if (role === 4) {
        state.customer.canAccessAppointment = true;
        state.customer.canAccessBooking = true;
      }

      else if (role === 2) {
        state.admin.canAccessDashboard = true;
        state.admin.canAccessBooking = true;
        state.admin.canAccessServices = true;
        state.admin.canAccessStaff = true;
        state.admin.canAccessSetting = true;
        state.admin.canAccessUser = true;
      }

      else if (role === 3) {
        state.employee.canAccessDeshbord = true;
        state.employee.canAccessService = true;
        state.employee.canAccessBooking = true;
      }

      else if (role === 1) {
        state.superAdmin.canAccessDeshboard = true;
        state.superAdmin.canAccessCompani = true;
        state.superAdmin.canAccessRequest = true;
        state.superAdmin.canAccessUser = true;
      }
    },

    resetUserContent: () => initialState,
  },
});

export const {
  setPermissionsByRole,
  resetUserContent,
} = userContentSlice.actions;

export default userContentSlice.reducer;