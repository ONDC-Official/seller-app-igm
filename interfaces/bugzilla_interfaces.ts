export interface BugzillaIssueProps {
  product: string;
  summary: string;
  transaction_id: string;
  alias: string;
  bpp_id: string;
  bpp_name: string;
  attachments: string[] | [];
}
