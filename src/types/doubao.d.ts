interface AccountDoubaoBalance {
    ResponseMetadata:{
        Error?:{
            Code: string
            Message: string
        }
    }
    Result?: {
        AccountID: string
        ArrearsBalance: string
        AvailableBalance: string
        CashBalance: string
        CreditLimit: string
        FreezeAmount: string
    }
}