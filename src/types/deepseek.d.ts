interface AccountBalance {
    is_available: boolean
    balance_infos: {
        currency: string
        total_balance: string
        granted_balance: string
        topped_up_balance: string
    }[]
}