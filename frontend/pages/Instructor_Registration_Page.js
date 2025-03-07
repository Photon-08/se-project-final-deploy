export default {
  template: `
    <div class="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div class="card shadow-lg p-4" style="max-width: 400px; width: 100%; border-radius: 10px;">
        <div class="card-body">
          <h2 class="text-center mb-3 text-secondary fw-bold">EduNex Registration</h2>
          <p class="text-center text-muted mb-4">Create your instructor account</p>
          <form @submit.prevent="student_registration">
            <div class="mb-3">
              <label for="user_name" class="form-label fw-semibold">User Name</label>
              <input type="text" id="user_name" v-model.trim="user_credentials.name" required 
                     class="form-control form-control-lg" placeholder="Enter your name" />
            </div>
            <div class="mb-3">
              <label for="user_email" class="form-label fw-semibold">Email Address</label>
              <input type="email" id="user_email" v-model.trim="user_credentials.email" required 
                     class="form-control form-control-lg" placeholder="Enter your email" />
            </div>
            <div class="mb-3">
              <label for="user_password" class="form-label fw-semibold">Password</label>
              <input type="password" id="user_password" v-model.trim="user_credentials.password" required 
                     class="form-control form-control-lg" placeholder="Enter your password" />
            </div>
            <button type="submit" class="btn btn-success btn-lg w-100">Register</button>
          </form>
          <div v-if="error" class="text-danger text-center mt-3 fw-semibold">{{ error }}</div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      user_credentials: {
        name: null,
        email: null,
        password: null,
      },
      error: null,
    }
  },

  methods: {
    async student_registration() {
      const res = await fetch('/instructor_registration', {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(this.user_credentials),
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        this.$router.push({ path: '/' });
      } else {
        alert("Account already exists, Please login!");
        this.$router.push({ path: '/login' });
      }
    }
  }
};
