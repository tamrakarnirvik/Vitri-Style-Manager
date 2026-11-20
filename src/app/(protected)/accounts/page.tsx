import { AccountsWorkspace } from "@/components/accounts/accounts-workspace";
import { getAccounts, getAccountEntries, getLegacyUnassigned } from "@/lib/business";
export default async function AccountsPage() {
 const [accounts, entries, legacy] = await Promise.all([getAccounts(),getAccountEntries(),getLegacyUnassigned()]);
 return <AccountsWorkspace accounts={accounts} entries={entries} legacy={legacy}/>;
}
