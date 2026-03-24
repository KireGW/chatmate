export function BootMessage({ title, message }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <section
        style={{
          width: 'min(680px, 100%)',
          padding: '24px',
          borderRadius: '24px',
          background: 'rgba(255,255,255,0.78)',
          border: '1px solid rgba(125, 92, 64, 0.16)',
          boxShadow: '0 18px 50px rgba(88, 54, 27, 0.08)',
          color: '#16333c',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Chatmate
        </p>
        <h1 style={{ margin: '12px 0 10px', fontSize: '32px', lineHeight: 1.05 }}>
          {title}
        </h1>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
      </section>
    </main>
  )
}
