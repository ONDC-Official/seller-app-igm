type ChangeFields<T, R> = Omit<T, keyof R> & R;

export type OmitKey<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type OmittedProviderNameFromItems = OmitKey<Item, "product_name">[];

// use this for /on_issue
export type OnIssue = ChangeFields<
  Omit<IBaseIssue, "logisticsTransactionId">,
  {
    context: Omit<Context, "ttl">;
    message: ChangeFields<
      Message,
      {
        issue: ChangeFields<
          Omit<
            Issue,
            | "order_details"
            | "issue_type"
            | "category"
            | "complainant_info"
            | "description"
            | "expected_resolution_time"
            | "expected_response_time"
            | "source"
            | "status"
            | "sub_category"
            | "rating"
            | "resolution"
            | "resolution_provider"
          >,
          {
            issue_actions: Omit<IssueActions, "complainant_actions">;
          }
        >;
      }
    >;
  }
>;

// issue for logistics payload
export type IssueRequestLogistics = ChangeFields<
  Omit<IBaseIssue, "logisticsTransactionId">,
  {
    message: ChangeFields<
      Message,
      {
        issue: ChangeFields<
          Omit<Issue, "resolution_provider" | "resolution">,
          {
            complainant_info: ChangeFields<
              ComplainantInfo,
              {
                person: Omit<Person, "email">;
              }
            >;

            order_details: ChangeFields<
              Omit<OrderDetails, "orderDetailsId" | "provider_name">,
              {
                items: Omit<Item, "product_name">[];
              }
            >;
          }
        >;
      }
    >;
  }
>;

export type IssueRequestLogisticsResolved = ChangeFields<
  Omit<IBaseIssue, "logisticsTransactionId">,
  {
    message: ChangeFields<
      Message,
      {
        issue: ChangeFields<
          Issue,
          {
            complainant_info: ChangeFields<
              ComplainantInfo,
              {
                person: Omit<Person, "email">;
              }
            >;
            order_details: ChangeFields<
              Omit<OrderDetails, "orderDetailsId" | "provider_name">,
              {
                items: Omit<Item, "product_name">[];
              }
            >;
          }
        >;
      }
    >;
  }
>;

// on_issue contains complainent actions
export type IssueRequest = ChangeFields<
  IBaseIssue,
  {
    message: ChangeFields<
      Message,
      {
        issue: Omit<Issue, "resolution" | "resolution_provider">;
      }
    >;
  }
>;

// use this for /on_issue_status when Seller has RESOLVED the issue

export type OnIssueStatusResoloved = ChangeFields<
  Omit<IBaseIssue, "logisticsTransactionId">,
  {
    context: Omit<Context, "ttl">;
    message: ChangeFields<
      Message,
      {
        issue: ChangeFields<
          Omit<
            Issue,
            | "order_details"
            | "issue_type"
            | "category"
            | "complainant_info"
            | "description"
            | "expected_resolution_time"
            | "expected_response_time"
            | "source"
            | "status"
            | "sub_category"
            | "rating"
          >,
          {
            issue_actions: Omit<IssueActions, "complainant_actions">;
          }
        >;
      }
    >;
  }
>;

/// Base interface for all the All Responses
export interface IBaseIssue {
  context: Context;
  message: Message;
  logisticsTransactionId?: string;
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
  timestamp: string;
  ttl: string;
}
export interface Message {
  issue: Issue;
}

enum Rating {
  "THUMBS-UP",
  "THUMBS-DOWN",
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
  rating?: Rating;
  resolution: Resolution | ResolutionWithoutRefund;
  resolution_provider: ResolutionProvider;
  created_at: string;
  updated_at: string;
}

export interface ResolutionProvider {
  respondent_info: RespondentInfo;
}

export interface Organization {
  org: Org;
  contact: Contact;
  person: Org;
}

export interface Contact {
  phone: string;
  email: string;
}

export interface Org {
  name: string;
}

export interface ResolutionSupport {
  chat_link: string;
  contact: Contact;
  gros: Gro[];
}

export interface Gro {
  person: Org;
  contact: Contact;
  gro_type: string;
}

export interface RespondentInfo {
  type: string;
  organization: Organization;
  resolution_support: ResolutionSupport;
}

export interface Resolution {
  short_desc: string;
  long_desc: string;
  action_triggered: "REFUND";
  refund_amount: string;
}

export interface ResolutionWithoutRefund {
  short_desc: string;
  long_desc: string;
  action_triggered: "RESOLVED" | "REPLACE" | "NO-ACTION" | "CASCADED" | string;
}

export interface ComplainantInfo {
  person: Person;
  contact: ComplainantInfoContact;
}
export interface ComplainantInfoContact {
  phone: string;
  email: string;
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
  respondent_actions: RespondentAction[];
}
export interface ComplainantAction {
  complainant_action: string;
  short_desc: string;
  updated_at: string;
  updated_by: UpdatedBy;
}
export interface UpdatedBy {
  org: Org;
  contact: UpdatedByContact;
  person: Org;
}
export interface RespondentAction {
  respondent_action: string;
  short_desc: string;
  updated_at: string;
  updated_by: UpdatedBy;
  cascaded_level: number;
}

export interface UpdatedBy {
  org: Org;
  contact: Contact;
  person: Org;
}

export interface Contact {
  phone: string;
  email: string;
}

export interface Org {
  name: string;
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
  orderDetailsId: String;
  state: string;
  items: Item[];
  fulfillments: Fulfillment[];
  provider_id: string;
  provider_name: string;
  merchant_order_id: string;
}
export interface Fulfillment {
  id: string;
  state: string;
}
export interface Item {
  id: string;
  product_name: string;
  quantity: number;
}
export interface Source {
  network_participant_id: string;
  type: string;
}
