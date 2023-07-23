export interface IIssueResponse {
  transaction_id: string;
  refund_amount: string;
  long_desc: string;
  respondent_action: string;
  short_desc: string;
  updated_at: string;
  cascaded_level: number;
  action_triggered:string
  updated_by: {
    org: {
      name: string;
    };
    contact: {
      phone: string;
      email: string;
    };
    person: {
      name: string;
    };
  };
}
