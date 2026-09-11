export default function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">
          <span className="gold-line" />
          {eyebrow}
        </p>
        <h1>{title}</h1>
        <p className="subtitle">{children}</p>
      </div>
    </div>
  );
}
