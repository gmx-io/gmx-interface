import axios from "axios";

const sendOtp = async (email, otp) => {
  try {
    const awsApi = process.env.REACT_APP_AWS_API;
    const response = await axios.post(awsApi, { toEmail: email, otp: otp });

    if (response.status !== 200) {
      throw new Error(`Failed to send OTP: ${response.status}`);
    }

    // Check if MessageId is present in the response data
    if (!response.data.MessageId) {
      throw new Error("Failed to send OTP: No MessageId in response");
    }

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return false;
  }
};

export default sendOtp;
