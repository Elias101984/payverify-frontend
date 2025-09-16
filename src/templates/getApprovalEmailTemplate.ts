
export const getApprovalEmailTemplate = (bankName: string, contactPerson: string) => `
  <div>
    <h2>Hello ${contactPerson},</h2>
    <p>Your bank <strong>${bankName}</strong> has been approved on PayVerify.</p>
    <p>You can now log in to your dashboard using your credentials.</p>
    <p>Welcome aboard!</p>
    <br/>
    <p>– PayVerify Team</p>
  </div>
`;
