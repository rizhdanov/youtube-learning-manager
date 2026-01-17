import { useState, useEffect } from 'react';
import { useVideos } from '../contexts/VideoContext';
import { FiTag, FiX } from 'react-icons/fi';
import './CategoryPicker.css';

const CategoryPicker = ({ video, onClose }) => {
  const { categories, updateVideo } = useVideos();
  const [selectedCategories, setSelectedCategories] = useState(video.category || []);

  useEffect(() => {
    setSelectedCategories(video.category || []);
  }, [video.category]);

  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleSave = () => {
    updateVideo(video.id, { category: selectedCategories });
    onClose();
  };

  if (categories.length === 0) {
    return (
      <div className="category-picker-modal" onClick={onClose}>
        <div className="category-picker-content" onClick={(e) => e.stopPropagation()}>
          <div className="picker-header">
            <h3><FiTag /> Assign Categories</h3>
            <button onClick={onClose} className="close-btn">
              <FiX />
            </button>
          </div>
          <p className="empty-state">
            No categories available. Create categories in Settings first.
          </p>
          <div className="picker-actions">
            <button onClick={onClose} className="cancel-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="category-picker-modal" onClick={onClose}>
      <div className="category-picker-content" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <h3><FiTag /> Assign Categories</h3>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        <p className="video-title-display">{video.title}</p>

        <div className="category-options">
          {categories.map(category => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={`category-option ${isSelected ? 'selected' : ''}`}
                style={{
                  borderColor: category.color,
                  backgroundColor: isSelected ? category.color : 'transparent',
                  color: isSelected ? 'white' : category.color,
                }}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        <div className="picker-actions">
          <button onClick={handleSave} className="save-btn">
            Save
          </button>
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryPicker;
