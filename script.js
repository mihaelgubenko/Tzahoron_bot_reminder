// Плавный скролл к форме при клике на CTA кнопку
document.addEventListener('DOMContentLoaded', function() {
    // Обработка плавного скролла
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
            e.preventDefault();
            const formSection = document.getElementById('contact-form');
            if (formSection) {
                formSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }

    // Обработка формы
    const leadForm = document.getElementById('leadForm');
    const formMessage = document.getElementById('formMessage');

    if (leadForm) {
        leadForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Получаем данные формы
            const formData = {
                parentName: document.getElementById('parentName').value,
                phone: document.getElementById('phone').value,
                childInfo: document.getElementById('childInfo').value,
                callTime: document.getElementById('callTime').value,
                consent: document.getElementById('consent').checked
            };

            // Валидация
            if (!formData.parentName || !formData.phone || !formData.consent) {
                showMessage('Пожалуйста, заполните все обязательные поля', 'error');
                return;
            }

            // Валидация телефона (базовая)
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            if (!phoneRegex.test(formData.phone)) {
                showMessage('Пожалуйста, введите корректный номер телефона', 'error');
                return;
            }

            // Отправка данных на сервер
            sendFormData(formData);
        });
    }

    function showMessage(text, type) {
        if (formMessage) {
            formMessage.textContent = text;
            formMessage.className = 'form-message ' + type;
            formMessage.style.display = 'block';

            // Автоматически скрыть сообщение через 5 секунд
            setTimeout(function() {
                formMessage.style.display = 'none';
            }, 5000);
        }
    }

    // Функция для отправки данных на сервер
    function sendFormData(data) {
        // Показываем индикатор загрузки
        const submitButton = leadForm.querySelector('.submit-button');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Отправка...';
        submitButton.disabled = true;

        fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showMessage(result.message || 'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в течение 24 часов.', 'success');
                leadForm.reset();
            } else {
                showMessage(result.message || 'Произошла ошибка. Пожалуйста, попробуйте позже.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('Произошла ошибка при отправке. Пожалуйста, проверьте подключение к интернету и попробуйте позже.', 'error');
        })
        .finally(() => {
            // Восстанавливаем кнопку
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        });
    }

    // Плавное появление элементов при скролле
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Применяем анимацию к секциям
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
});

