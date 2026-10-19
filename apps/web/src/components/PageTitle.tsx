import styles from './PageTitle.module.css';

export function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className={styles.title}><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</header>;
}
