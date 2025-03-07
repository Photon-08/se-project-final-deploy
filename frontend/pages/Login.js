export default {
  template: `
    <div class="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div class="card shadow-lg p-4" style="max-width: 400px; width: 100%; border-radius: 10px;">
        <div class="card-body">
          <h2 class="text-center mb-3 text-secondary fw-bold">EduNex Login</h2>
          <p class="text-center text-muted mb-4">Sign in to your account</p>
          <form @submit.prevent="login">
            <div class="mb-3">
              <label for="email" class="form-label fw-semibold">Email</label>
              <input type="email" id="email" v-model.trim="user_credentials.email" required 
                     class="form-control form-control-lg" placeholder="Enter your email" />
            </div>
            <div class="mb-3">
              <label for="password" class="form-label fw-semibold">Password</label>
              <input type="password" id="password" v-model.trim="user_credentials.password" required 
                     class="form-control form-control-lg" placeholder="Enter your password" />
            </div>
            <button type="submit" class="btn btn-primary btn-lg w-100">Login</button>
          </form>
          <div v-if="error" class="text-danger text-center mt-3 fw-semibold">{{ error }}</div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      user_credentials: {
        email: null,
        password: null,
      },
      error: null,
    }
  },

  methods: {
    async login() {
      const res = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify(this.user_credentials),
      });
      const data = await res.json();
      if (res.ok) { 
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('email', data.email);
        localStorage.setItem('user_name', data.name);
        
        if (data.role === 'student') {
          this.$router.push({ path: '/student_dashboard' });
        } else if (data.role === 'admin') {
          this.$router.push({ path: '/admin_dashboard' });
        } else if (data.role === 'instructor') {
          this.$router.push({ path: '/instructor_dashboard' });
        } else {
          this.error = 'Unknown role';
        }
      } else {
        this.error = data.message;
      }
    }
  }
};
