import { useParams, Navigate } from 'react-router-dom'

export default function ReferralLink() {
    const { code } = useParams()

    return (
        <Navigate to={'/trade'} replace state={code ? { code } : undefined}></Navigate>
    )
}