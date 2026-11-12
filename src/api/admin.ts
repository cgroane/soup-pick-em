import cfbdApi from ".";

export const getImpersonationToken = async (userId: string) => {
  const res = await cfbdApi.get<{ customToken: string }>("admin/impersonate", { params: { userId } });
  return res.data.customToken;
};
