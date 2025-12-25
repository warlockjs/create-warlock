import { User } from "../models/user";

export default function getNewCustomers() {
  return User.aggregate().where("isCustomer", true).limit(6).get();
}
