export interface Issue {
  context: Context;
  message: Message;
}
export interface Context {
  domain: string;
  country: string;
  city: string;
  action: string;
  core_version: string;
  bap_id: string;
  bap_uri: string;
  bpp_id: string;
  bpp_uri: string;
  transaction_id: string;
  message_id: string;
  timestamp: Date;
  ttl: string;
}
export interface Message {
  issue: Issue;
}
export interface Issue {
  id: string;
  category: string;
  sub_category: string;
  complainant_info: ComplainantInfo;
  order_details: OrderDetails;
  description: Description;
  source: Source;
  expected_response_time: ExpectedResTime;
  expected_resolution_time: ExpectedResTime;
  status: string;
  issue_type: string;
  issue_actions: IssueActions;
  created_at: Date;
  updated_at: Date;
}
export interface ComplainantInfo {
  person: Person;
  contact: ComplainantInfoContact;
}
export interface ComplainantInfoContact {
  phone: string;
}
export interface Person {
  name: string;
  email: string;
}
export interface Description {
  short_desc: string;
  long_desc: string;
  additional_desc: AdditionalDesc;
  images: string[];
}
export interface AdditionalDesc {
  url: string;
  content_type: string;
}
export interface ExpectedResTime {
  duration: string;
}
export interface IssueActions {
  complainant_actions: ComplainantAction[];
}
export interface ComplainantAction {
  complainant_action: string;
  short_desc: string;
  updated_at: Date;
  updated_by: UpdatedBy;
}
export interface UpdatedBy {
  org: Org;
  contact: UpdatedByContact;
  person: Org;
}
export interface UpdatedByContact {
  phone: string;
  email: string;
}
export interface Org {
  name: string;
}
export interface OrderDetails {
  id: string;
  state: string;
  items: Item[];
  fulfillments: Fulfillment[];
  provider_id: string;
}
export interface Fulfillment {
  id: string;
  state: string;
}
export interface Item {
  id: string;
  quantity: number;
}
export interface Source {
  network_participant_id: string;
  type: string;
}
