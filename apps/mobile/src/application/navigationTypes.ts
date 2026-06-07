export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Sop: undefined;
  Mine: undefined;
};

export type AttendanceStackParamList = {
  AttendanceList: undefined;
};

export type SopStackParamList = {
  SopList: undefined;
  SopDetail: {sopId: string};
};

export type MineStackParamList = {
  MineHome: undefined;
  Settings: undefined;
};
