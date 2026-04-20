import React from 'react';

const PredictionForm = ({ formData, handleInputChange, handleSubmit, loading }) => {
  return (
    <form className="prediction-form" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Enter Patient Details</h3>
      
      <div className="form-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Age *</label>
          <input
            type="number"
            name="age"
            className="form-input"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            value={formData.age}
            onChange={handleInputChange}
            required
            min="1"
            max="120"
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Gender *</label>
          <select
            name="gender"
            className="form-select"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            value={formData.gender}
            onChange={handleInputChange}
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Disease Type *</label>
          <select
            name="disease"
            className="form-select"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            value={formData.disease}
            onChange={handleInputChange}
            required
          >
            <option value="General">General</option>
            <option value="Cardiac">Cardiac</option>
            <option value="Respiratory">Respiratory</option>
            <option value="Orthopedic">Orthopedic</option>
            <option value="Neurological">Neurological</option>
            <option value="Infectious">Infectious</option>
            <option value="Diabetes">Diabetes/Endocrine</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Admission Type *</label>
          <select
            name="admission_type"
            className="form-select"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            value={formData.admission_type}
            onChange={handleInputChange}
            required
          >
            <option value="Normal">Normal</option>
            <option value="Emergency">Emergency</option>
            <option value="ICU">ICU Transfer</option>
            <option value="Surgery">Planned Surgery</option>
          </select>
        </div>
      </div>

      <div className="form-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginTop: '16px'
      }}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Blood Pressure (Systolic) *</label>
          <input
            type="number"
            name="bp"
            className="form-input"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            value={formData.bp}
            onChange={handleInputChange}
            required
            min="60"
            max="250"
            placeholder="e.g. 120"
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Blood Sugar (mg/dL) *</label>
          <input
            type="number"
            name="sugar"
            className="form-input"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            value={formData.sugar}
            onChange={handleInputChange}
            required
            min="40"
            max="600"
            placeholder="e.g. 100"
          />
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
            <input
              type="checkbox"
              name="history"
              checked={formData.history}
              onChange={handleInputChange}
              style={{ marginRight: '8px', width: '18px', height: '18px' }}
            />
            Previous Medical History?
          </label>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '6px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
            opacity: loading ? 0.7 : 1,
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
          }}
        >
          {loading ? 'Analyzing Data...' : 'Run Predictions ⚡'}
        </button>
      </div>
    </form>
  );
};

export default PredictionForm;
