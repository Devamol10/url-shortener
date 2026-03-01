import { nanoid } from "nanoid";

const generateShortCode = () => {
  return nanoid(6);
};

export default generateShortCode;