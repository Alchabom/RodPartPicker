import { Link } from 'react-router'
import styles from './NotFound.module.css'

interface NotFoundProps {
  message?: string
  backTo?: string
  backLabel?: string
}

export function NotFound({
  message = "We couldn't find that page.",
  backTo = '/',
  backLabel = 'Back to home',
}: NotFoundProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Not found</h1>
      <p className={styles.message}>{message}</p>
      <Link to={backTo} className={styles.backLink}>
        {backLabel}
      </Link>
    </div>
  )
}
